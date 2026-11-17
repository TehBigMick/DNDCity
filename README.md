# Lantern Quay

The dndCity.com storefront offers three level 3 one-shots, a bundle of those three, a level 1–5 campaign and three free adventures for D&D 5e.

## Run locally

Run `python3 -m http.server 8000 --directory dist` and open [the local storefront](http://localhost:8000/). The static site needs no build step.

## Cloudflare deployment

`worker.mjs` serves the public files from Workers KV and uses D1 to record orders. The production Worker is `dndcity` and uses the zone's custom domains.

- Run `python3 deploy/prepare_files.py OUTPUT` from the repository root to prepare public files. Pass `--pack SKU ZIP` for each matching ZIP in `deploy/catalogue.json`. Keep those ZIPs outside the repository and `dist/`.
- Upload each file in `OUTPUT/chunks/` to the private KV namespace under its filename and bind the namespace as `FILES`. Bind the manifest's `public` and `paid` objects as `ASSET_MANIFEST` and `PACK_MANIFEST`, respectively.
- Apply `deploy/orders.sql` to the D1 database before enabling checkout and bind the database as `ORDERS`. The Worker stores a hash of the Stripe session ID, the purchased SKU and the payment status.

## Stripe checkout

Use one-off prices from `deploy/catalogue.json`. Each Stripe Payment Link redirects buyers to `https://dndcity.com/order?session_id={CHECKOUT_SESSION_ID}` after checkout.

1. Register `https://dndcity.com/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`. Store its signing secret in the Worker secret `STRIPE_WEBHOOK_SECRET`.
2. Set the Worker's JSON binding `CHECKOUT_LINKS` to a mapping of catalogue SKUs to objects with a Stripe Payment Link `id` and `url`. The Worker shows the corresponding buy button when the link, pack and webhook secret are present. Use `STRIPE_MODE=test` on a separate test deployment.
3. Test a complete Stripe sandbox purchase and open the delivered ZIP. Keep the redirect and webhook on the same deployment during testing.

Buyers return to their order page to download the ZIP after Stripe has confirmed payment. Give customers that page again if they need to resume a download. Order URLs are private and confer access to the purchased files.

The adventure setting is independent and compatible with Dungeons & Dragons 5e.
