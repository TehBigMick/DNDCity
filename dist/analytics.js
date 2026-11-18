(() => {
  const measurementId = "G-0DYQYNMX6T";
  const preferenceKey = "dndcity.analytics-consent";
  const disableKey = "ga-disable-" + measurementId;
  let tagInstalled = false;

  function readPreference() {
    try {
      return localStorage.getItem(preferenceKey);
    } catch {
      return null;
    }
  }

  const notice = document.createElement("section");
  notice.id = "analytics-cookies";
  notice.className = "analytics-notice";
  notice.setAttribute("aria-labelledby", "analytics-cookies-title");
  notice.innerHTML = [
    '<h2 id="analytics-cookies-title">Analytics cookies</h2>',
    '<p>We use Google Analytics cookies to measure visits to D&amp;D City. You can change your choice in Cookie settings.</p>',
    '<div class="analytics-actions">',
    '<button type="button" class="button secondary" data-analytics-choice="denied">Decline</button>',
    '<button type="button" class="button secondary" data-analytics-choice="granted">Allow analytics</button>',
    '</div>'
  ].join("");
  document.body.append(notice);

  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "analytics-settings";
  settings.textContent = "Cookie settings";
  settings.setAttribute("aria-controls", notice.id);
  const footer = document.querySelector(".footer-content");
  if (footer) {
    footer.append(settings);
  } else {
    const settingsRow = document.createElement("div");
    settingsRow.className = "frame analytics-settings-row";
    settingsRow.append(settings);
    document.body.append(settingsRow);
  }

  const denied = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };

  function startAnalytics() {
    window[disableKey] = false;
    if (tagInstalled) {
      window.gtag("consent", "update", { analytics_storage: "granted" });
      return;
    }

    window.dataLayer ??= [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("consent", "default", denied);
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname,
      page_referrer: document.referrer ? new URL(document.referrer).origin : ""
    });

    const tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
    document.head.append(tag);
    tagInstalled = true;
  }

  function stopAnalytics() {
    window[disableKey] = true;
    if (tagInstalled) {
      window.gtag("consent", "update", denied);
    }
    for (const cookie of ["_ga", "_ga_" + measurementId.slice(2)]) {
      const expiry = cookie + "=; Max-Age=0; Path=/";
      document.cookie = expiry;
      if (location.hostname === "dndcity.com" || location.hostname.endsWith(".dndcity.com")) {
        document.cookie = expiry + "; Domain=dndcity.com";
      }
    }
  }

  function showNotice(show) {
    notice.hidden = !show;
    settings.setAttribute("aria-expanded", String(show));
  }

  function applyPreference(preference) {
    if (preference === "granted") {
      startAnalytics();
    } else {
      stopAnalytics();
    }
    showNotice(preference !== "granted" && preference !== "denied");
  }

  settings.addEventListener("click", () => {
    showNotice(notice.hidden);
    if (!notice.hidden) notice.querySelector("button").focus();
  });

  for (const button of notice.querySelectorAll("[data-analytics-choice]")) {
    button.addEventListener("click", () => {
      const choice = button.dataset.analyticsChoice;
      try {
        localStorage.setItem(preferenceKey, choice);
      } catch {
        // Apply the choice on this page when browser storage is unavailable.
      }
      applyPreference(choice);
      settings.focus();
    });
  }

  window.addEventListener("storage", event => {
    if (event.key === preferenceKey || event.key === null) applyPreference(readPreference());
  });

  applyPreference(readPreference());
})();
