import { checkoutUrls, harbourArt } from "./store-config.js";
import { drawQuay } from "./quay-map.js";

for (const card of document.querySelectorAll("[data-product]")) {
  const address = checkoutUrls[card.dataset.product];
  if (!address) continue;
  try {
    const url = new URL(address);
    if (url.protocol !== "https:" || url.username || url.password) continue;
    const link = card.querySelector("[data-buy]");
    link.href = url.href;
    link.hidden = false;
    card.querySelector("[data-pending]").hidden = true;
  } catch {
    // Leave the availability message visible for an invalid link.
  }
}

const hero = document.querySelector(".hero");
if (hero && harbourArt) {
  const cover = new Image();
  cover.addEventListener("load", () => {
    hero.style.setProperty("--hero-art", "url(" + JSON.stringify(cover.src) + ")");
  });
  cover.src = harbourArt;
}

for (const canvas of document.querySelectorAll("[data-quay-map]")) {
  drawQuay(canvas, canvas.hasAttribute("data-grid"));
}

const mapControls = document.querySelector(".map-buttons");
if (mapControls) {
  const heading = document.querySelector("#map-name");
  const description = document.querySelector("#map-description");
  mapControls.hidden = false;
  mapControls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-place]");
    if (!button) return;
    mapControls.querySelector('[aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-pressed", "true");
    heading.textContent = button.dataset.place;
    description.textContent = button.dataset.description;
  });
}

const printButton = document.querySelector("[data-print]");
if (printButton) {
  printButton.hidden = false;
  printButton.addEventListener("click", () => window.print());
}
