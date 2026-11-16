# Fieldcast

A standalone single-page weather atlas. Search for a city or choose a quick pick to see current conditions, a five-day forecast, and country context.

## Run

Extract the ZIP and open index.html in a modern browser with internet access. Keep all files together. No API keys, dependencies, or build step are needed. If your browser restricts local files, serve the extracted directory with a static server (for example, python3 -m http.server 8000) and open http://localhost:8000.

## Data sources

- [Open-Meteo](https://open-meteo.com/en/docs) provides current conditions and forecasts; its [geocoding API](https://open-meteo.com/en/docs/geocoding-api) searches for cities. Open-Meteo appears in the [Public APIs directory](https://github.com/public-apis/public-apis#weather).
- [World Bank Open Data](https://data.worldbank.org/) supplies capital, region, and income group via the [Country API](https://datahelpdesk.worldbank.org/knowledgebase/articles/898590-country-api-queries). Region and income groups use World Bank classifications.
- app.js requests both providers with the browser Fetch API. styles.css holds the responsive styling.

## Verification

The W3C Nu HTML Checker returned no messages for index.html. Its JSON response is included. Browser checks confirmed Lisbon and Tokyo forecasts with country data, five forecast days, Fahrenheit conversion, and keyboard-submitted Springfield results with focus moved to the first location choice.
