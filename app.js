'use strict';

const $ = id => document.getElementById(id);
let pending;
let activeWeather;
let units = 'c';
const cityLabels = city => [...new Set([city.name, city.admin1, city.country].filter(Boolean))].join(', ');

async function getJSON(base, params, signal) {
  const url = new URL(base);
  url.search = new URLSearchParams(params);
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

function begin(message) {
  pending?.abort();
  pending = new AbortController();
  $('choices').hidden = true;
  $('status').textContent = message;
  return pending.signal;
}

async function findCity(query, chooseFirst = false) {
  const signal = begin('Looking up ' + query + '…');
  try {
    const data = await getJSON('https://geocoding-api.open-meteo.com/v1/search',
      { name: query, count: 6, language: 'en', format: 'json' }, signal);
    if (signal.aborted) return;
    const cities = data.results || [];
    if (!cities.length) {
      $('status').textContent = 'No cities found. Try a different spelling.';
      return;
    }
    if (chooseFirst || cities.length === 1) return showCity(cities[0], !chooseFirst);
    $('matches').replaceChildren(...cities.map(city => {
      const button = el('button', cityLabels(city));
      button.type = 'button';
      button.addEventListener('click', () => showCity(city, true));
      const item = el('li');
      item.append(button);
      return item;
    }));
    $('choices').hidden = false;
    $('status').textContent = 'Select one of ' + cities.length + ' matching locations.';
    $('matches').querySelector('button').focus();
  } catch {
    if (!signal.aborted) $('status').textContent = 'City search is unavailable right now. Check your connection and try again.';
  }
}

function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function pair(label, value) {
  const group = el('div');
  group.append(el('dt', label), el('dd', value || 'Not available'));
  return group;
}

function describe(code) {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45,48].includes(code)) return 'Fog';
  if ([51,53,55].includes(code)) return 'Drizzle';
  if ([56,57].includes(code)) return 'Freezing drizzle';
  if ([61,63,65].includes(code)) return 'Rain';
  if ([66,67].includes(code)) return 'Freezing rain';
  if ([71,73,75,77].includes(code)) return 'Snow';
  if ([80,81,82].includes(code)) return 'Rain showers';
  if ([85,86].includes(code)) return 'Snow showers';
  if ([95,96,99].includes(code)) return 'Thunderstorms';
  return 'Conditions unavailable';
}

function temp(value) {
  return Number.isFinite(value) ? Math.round(units === 'f' ? value * 9 / 5 + 32 : value) + '°' + units.toUpperCase() : '—';
}

function renderWeather() {
  if (!activeWeather) return;
  const {current, daily, timezone_abbreviation: zone} = activeWeather;
  $('temperature').textContent = temp(current.temperature_2m);
  $('condition').textContent = describe(current.weather_code);
  $('observed').textContent = 'Conditions for ' + current.time.replace('T', ' at ') + ' ' + (zone || 'local time');
  $('metrics').replaceChildren(pair('Feels like', temp(current.apparent_temperature)),
    pair('Humidity', current.relative_humidity_2m == null ? null : current.relative_humidity_2m + '%'),
    pair('Wind', current.wind_speed_10m == null ? null : Math.round(current.wind_speed_10m) + ' km/h'));
  $('days').replaceChildren(...daily.time.map((date, i) => {
    const item = el('li');
    const day = el('time', new Intl.DateTimeFormat('en', {weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date + 'T00:00:00Z')));
    day.dateTime = date;
    item.append(day, el('strong', 'High ' + temp(daily.temperature_2m_max[i])),
      el('span', 'Low ' + temp(daily.temperature_2m_min[i]) + ' · ' + describe(daily.weather_code[i])));
    return item;
  }));
}

async function showCity(city, moveFocus) {
  const signal = begin('Loading the forecast for ' + city.name + '…');
  if (moveFocus && document.activeElement === document.body) $('city').focus();
  try {
    const data = await getJSON('https://api.open-meteo.com/v1/forecast', {
      latitude: city.latitude, longitude: city.longitude, timezone: 'auto', forecast_days: 5,
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min'
    }, signal);
    if (signal.aborted) return;
    if (!data.current || !Array.isArray(data.daily?.time)) throw new Error('Incomplete forecast');
    activeWeather = data;
    $('place').textContent = city.name;
    $('place').tabIndex = -1;
    $('location').textContent = [city.admin1 === city.name ? '' : city.admin1, city.country].filter(Boolean).join(' · ');
    renderWeather();
    $('country-content').replaceChildren(el('p', 'Loading country data…'));
    $('report').hidden = false;
    $('status').textContent = 'Forecast ready for ' + city.name + '.';
    if (moveFocus && [document.body, $('city')].includes(document.activeElement)) $('place').focus();
    try {
      if (!/^[A-Z]{2}$/.test(city.country_code)) throw new Error('No country code');
      const result = await getJSON('https://api.worldbank.org/v2/country/' + city.country_code, {format:'json'}, signal);
      if (signal.aborted) return;
      const info = result[1]?.[0];
      if (!info?.name) throw new Error('No country data');
      const facts = el('dl');
      facts.append(pair('Capital', info.capitalCity), pair('Region', info.region?.value), pair('Income group', info.incomeLevel?.value));
      $('country-content').replaceChildren(el('h4', info.name), facts);
    } catch {
      if (!signal.aborted) $('country-content').replaceChildren(el('p', 'Country data is unavailable for this location. The forecast is still available.'));
    }
  } catch {
    if (!signal.aborted) $('status').textContent = 'Could not load the forecast for ' + city.name + '. Try the search again.';
  }
}

$('search').addEventListener('submit', event => {
  event.preventDefault();
  const query = $('city').value.trim();
  if (query.length < 2) {
    begin('Enter at least two letters or digits.');
    $('city').focus();
    return;
  }
  findCity(query);
});
document.querySelectorAll('[data-city]').forEach(button => {
  button.addEventListener('click', () => {
    $('city').value = button.dataset.city;
    findCity(button.dataset.city, true);
  });
});
document.querySelectorAll('[name="units"]').forEach(radio => {
  radio.addEventListener('change', () => {
    units = radio.value;
    renderWeather();
  });
});
findCity('Lisbon', true);
