const supportedEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
]);
const encoder = new TextEncoder();

function response(body, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(body, { ...options, headers });
}

function privateResponse(body, status, headers) {
  return response(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      ...headers,
    },
  });
}

function enabledProducts(env) {
  if (!env.ORDERS || !env.FILES || !env.STRIPE_WEBHOOK_SECRET) return [];
  return Object.entries(env.CHECKOUT_LINKS ?? {}).filter(([sku, link]) => {
    if (!Object.hasOwn(env.PACK_MANIFEST ?? {}, sku) || !/^plink_[\w]+$/.test(link?.id)) return false;
    try {
      const url = new URL(link.url);
      return url.origin === "https://buy.stripe.com" && !url.username && !url.password;
    } catch {
      return false;
    }
  });
}

function sessionId(value, env) {
  const prefix = env.STRIPE_MODE === "test" ? "cs_test_" : "cs_live_";
  return typeof value === "string"
    && value.startsWith(prefix)
    && /^cs_(test|live)_[a-zA-Z0-9_]{16,220}$/.test(value) ? value : null;
}

async function sessionKey(value) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyStripe(raw, signature, secret) {
  if (!signature || signature.length > 2048) return false;
  const fields = new URLSearchParams(signature.replaceAll(",", "&"));
  const timestamp = fields.get("t");
  const now = Date.now() / 1000;
  if (!/^\d{10,11}$/.test(timestamp ?? "") || Math.abs(now - Number(timestamp)) > 300) return false;
  const signatures = fields.getAll("v1").filter(part => /^[0-9a-f]{64}$/.test(part)).slice(0, 8);
  if (signatures.length === 0) return false;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  const payload = encoder.encode(timestamp + "." + raw);
  for (const candidate of signatures) {
    const bytes = Uint8Array.from(candidate.match(/../g), part => Number.parseInt(part, 16));
    if (await crypto.subtle.verify("HMAC", key, bytes, payload)) return true;
  }
  return false;
}

async function stripeWebhook(request, env, products) {
  if (request.method !== "POST") return privateResponse("Method not allowed", 405, { Allow: "POST" });
  if (!env.STRIPE_WEBHOOK_SECRET) return privateResponse("Checkout coming soon", 503);
  if (Number(request.headers.get("Content-Length")) > 262144) return privateResponse("Payload too large", 413);
  const raw = await request.text();
  if (raw.length > 262144) return privateResponse("Payload too large", 413);
  const signature = request.headers.get("stripe-signature");
  if (!(await verifyStripe(raw, signature, env.STRIPE_WEBHOOK_SECRET))) {
    return privateResponse("Invalid Stripe signature", 400);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return privateResponse("Invalid Stripe event", 400);
  }
  const session = event?.data?.object;
  const id = sessionId(session?.id, env);
  if (!supportedEvents.has(event?.type) || event.livemode !== (env.STRIPE_MODE !== "test")
    || session?.object !== "checkout.session" || session.mode !== "payment" || !id) {
    return privateResponse(null, 204);
  }
  const match = products.find(([, link]) => link.id === session.payment_link);
  if (!match) return privateResponse(null, 204);
  const sku = match[0];
  const state = session.payment_status === "paid" && Number(session.amount_total) > 0
    && event.type !== "checkout.session.async_payment_failed" ? "paid"
    : event.type === "checkout.session.async_payment_failed" ? "failed" : "pending";

  await env.ORDERS.prepare(`
    INSERT INTO orders (session_key, sku, state) VALUES (?1, ?2, ?3)
    ON CONFLICT (session_key) DO UPDATE SET state = excluded.state
    WHERE orders.sku = excluded.sku AND orders.state <> 'paid'
      AND (orders.state = 'pending' OR excluded.state = 'paid')
  `).bind(await sessionKey(id), sku, state).run();
  return privateResponse(null, 204);
}

async function fileResponse(request, env, file, download = false) {
  const baseHeaders = {
    "Content-Type": file.type,
    "Content-Length": String(file.size),
    "Cache-Control": file.type.startsWith("text/html") ? "no-cache" : "public, max-age=300",
  };
  let body = null;
  if (request.method !== "HEAD") {
    const first = await env.FILES.get(file.key + ":0", "arrayBuffer");
    if (first === null) return privateResponse("File temporarily unavailable", 503);
    if (file.parts === 1) {
      body = first;
    } else {
      let part = 0;
      body = new ReadableStream({
        async pull(controller) {
          const bytes = part === 0 ? first : await env.FILES.get(file.key + ":" + part, "arrayBuffer");
          if (bytes === null) {
            controller.error(new Error("A file part is unavailable"));
            return;
          }
          controller.enqueue(new Uint8Array(bytes));
          part += 1;
          if (part >= file.parts) controller.close();
        },
      });
    }
  }
  if (download) {
    delete baseHeaders["Cache-Control"];
    return privateResponse(body, 200, {
      ...baseHeaders,
      "Content-Disposition": 'attachment; filename="' + file.name + '"',
    });
  }
  return response(body, { headers: baseHeaders });
}

function orderPage(request, status, heading, description, action = "", refresh = "") {
  const body = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading} | Lantern Quay</title>
${refresh}<link rel="stylesheet" href="/style.css"></head>
<body><header class="site-header"><div class="frame header-content"><a class="brand" href="/">Lantern Quay</a></div></header>
<main class="encounter frame"><h1>${heading}</h1><p>${description}</p><div class="actions">${action}
<a class="button secondary" href="/">Back to Lantern Quay</a></div></main></body></html>`;
  return privateResponse(request.method === "HEAD" ? null : body, status, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": "default-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
}

async function order(request, url, env) {
  const id = sessionId(url.searchParams.get("session_id"), env);
  if (!id || !env.ORDERS) return privateResponse("Order unavailable", 404);
  const row = await env.ORDERS.prepare("SELECT sku, state FROM orders WHERE session_key = ?1")
    .bind(await sessionKey(id)).first();
  const file = Object.hasOwn(env.PACK_MANIFEST ?? {}, row?.sku) ? env.PACK_MANIFEST[row.sku] : null;
  if (row?.state === "paid" && file) {
    if (url.pathname === "/download") return fileResponse(request, env, file, true);
    return orderPage(request, 200, "Your adventure is ready", "Download the ZIP to get the files from your order.",
      `<a class="button primary" href="/download?session_id=${id}">Download your adventure</a>`);
  }
  if (url.pathname === "/download") return privateResponse("Download unavailable", 404);
  if (row?.state === "failed") {
    return orderPage(request, 200, "Payment wasn’t completed", "Return to the shop if you’d like to try again.");
  }
  const check = Number(url.searchParams.get("check") ?? "0");
  const retry = Number.isInteger(check) && check >= 0 && check < 6
    ? `<meta http-equiv="refresh" content="5;url=/order?session_id=${id}&amp;check=${check + 1}">` : "";
  return orderPage(request, 202, "Checking your payment", "Keep this page to check again once Stripe has confirmed your payment.",
    `<a class="button primary" href="/order?session_id=${id}">Check again</a>`, retry);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.dndcity.com") {
      url.hostname = "dndcity.com";
      url.protocol = "https:";
      url.port = "";
      return response(null, { status: 308, headers: { Location: url.href } });
    }
    try {
      const products = enabledProducts(env);
      if (url.pathname === "/stripe/webhook") return await stripeWebhook(request, env, products);
      if (request.method !== "GET" && request.method !== "HEAD") {
        return response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
      }
      if (url.pathname === "/checkout-config.json") {
        const hrefs = Object.fromEntries(products.map(([sku, link]) => [sku, link.url]));
        return response(request.method === "HEAD" ? null : JSON.stringify(hrefs), {
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
      if (url.pathname === "/download" || url.pathname === "/order") return await order(request, url, env);
      const path = url.pathname === "/" ? "/index.html" : url.pathname;
      const file = Object.hasOwn(env.ASSET_MANIFEST ?? {}, path) ? env.ASSET_MANIFEST[path] : null;
      if (!file) return response(request.method === "HEAD" ? null : "Page not found", { status: 404 });
      return await fileResponse(request, env, file);
    } catch {
      return privateResponse("Temporarily unavailable", 503);
    }
  },
};
