# Weather App (No build)

Simple, fast weather web app using Open-Meteo APIs. No API key required.

## Run locally

- Option 1: Open `index.html` directly in a modern browser.
- Option 2: Serve with a static server to avoid any CORS quirks:
  - Python: `python -m http.server 5500`
  - Node: `npx serve -l 5500`
  - Then open `http://localhost:5500/`.

## Features

- City search with geocoding (Open-Meteo)
- Use my location via browser geolocation
- Current conditions and 7-day forecast
- Clean, responsive UI

## Tech

- Vanilla JS, HTML, CSS
- Data: https://open-meteo.com/ and their Geocoding API

## Notes

- Geolocation requires HTTPS in production or localhost in dev.
- Data is fetched client-side; ensure network access is allowed.

