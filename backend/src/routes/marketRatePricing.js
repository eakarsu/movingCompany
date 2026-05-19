// Market-rate pricing engine (weather, fuel, distance, capacity).
// TODO: configure credentials — OPENWEATHER_API_KEY, EIA_API_KEY (US fuel index).
const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

async function fetchFuelPrice() {
  if (!process.env.EIA_API_KEY) return null;
  try {
    // EIA Diesel weekly price.
    const r = await fetch(`https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${process.env.EIA_API_KEY}&frequency=weekly&data[0]=value&facets[product][]=EPD2D&sort[0][column]=period&sort[0][direction]=desc&length=1`);
    const d = await r.json();
    return d?.response?.data?.[0]?.value || null;
  } catch { return null; }
}

async function fetchWeather(lat, lng) {
  if (!process.env.OPENWEATHER_API_KEY) return null;
  try {
    const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHER_API_KEY}&units=imperial`);
    return await r.json();
  } catch { return null; }
}

router.post('/price', authenticate, async (req, res) => {
  try {
    const { distanceMiles = 25, cubicFeet = 500, originLat, originLng, capacityRemainingPct = 0.5 } = req.body;
    const base = 0.85 * cubicFeet + 1.5 * distanceMiles;
    const fuel = await fetchFuelPrice();
    const weather = (originLat && originLng) ? await fetchWeather(originLat, originLng) : null;

    const fuelMultiplier = fuel ? Math.max(0.95, Math.min(1.25, fuel / 4.0)) : 1.0;
    const weatherMultiplier = weather && weather.weather?.[0]?.main && ['Rain', 'Snow', 'Thunderstorm'].includes(weather.weather[0].main) ? 1.15 : 1.0;
    const capacityMultiplier = capacityRemainingPct < 0.2 ? 1.2 : capacityRemainingPct > 0.8 ? 0.9 : 1.0;

    const total = base * fuelMultiplier * weatherMultiplier * capacityMultiplier;
    res.json({
      base: Math.round(base),
      fuel: fuel ?? 'unavailable',
      fuelMultiplier,
      weather: weather?.weather?.[0]?.main || 'unavailable',
      weatherMultiplier,
      capacityMultiplier,
      priceUSD: Math.round(total)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
