# Lantern Quay

Lantern Quay is the dndCity.com storefront for five independent adventures for Dungeons & Dragons 5e. The public website and free adventures live in `dist/`.

## Run locally

Run `python3 -m http.server 8000 --directory dist` and open [http://localhost:8000/](http://localhost:8000/). The site has no build step.

## Adventures

- **The Clockwork Crossing** is a free 45–60 minute one-shot for a first-time Dungeon Master and 3–4 level 1 characters. The [adventure page](dist/clockwork-crossing.html) links to the guide, at-table sheet and map.
- **The First Lantern** is a free introduction for 3–4 level 1 characters. Its [adventure page](dist/first-lantern.html) links to the DM guide, four character sheets and a player map.
- **The Bell Beneath the Docks** is a level 3 harbour mystery.
- **The Thirteenth Stall** is a level 3 auction caper in Copper Market.
- **The House That Changed Streets** is a level 3 rescue in Old Town.

The free 5e encounter, *The Rope at Low Water*, is printable from the site. The three paid ZIPs are delivered by the checkout provider.

## Storefront setup

1. Upload each finished 5e pack to a digital-product checkout. The docks adventure was priced at US$9.
2. Add the corresponding public HTTPS checkout URLs in `dist/store-config.js`. A purchase link appears for each configured adventure.
3. Deploy `dist/` to the store's static host.

The storefront runs with the harbour illustration disabled. To restore the original artwork, place `harbour.webp` in `dist/assets/` and set `harbourArt` to `'./assets/harbour.webp'` in `dist/store-config.js`. Store the finished paid ZIPs in your checkout provider's delivery area, outside the public site.

Lantern Quay is an independent fantasy setting. The adventures are compatible with Dungeons & Dragons 5e.
