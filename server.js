import express from "express";
import fetch from "node-fetch";
import { getPlanet, getHeliocentricPositions } from "./astro/planets.js";
import { getSunPosition, getMoonPosition } from "./astro/sunmoon.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------
const N2YO_KEY = process.env.N2YO_KEY;

app.use(express.static("public"));

const LOCATIONS = {
  vourles: { lat: 45.6601, lon: 4.7713, alt: 200, name: "Vourles" },
  lans:    { lat: 45.1391, lon: 5.5856, alt: 1000, name: "Lans-en-Vercors" }
};

// ------------------------------------------------------------
// ROUTE PLANÈTES
// ------------------------------------------------------------
app.get("/api/planet/:name", (req, res) => {
  try {
    const name = req.params.name;
    const loc = LOCATIONS.vourles;

    const offset = Number(req.query.offset || 0);
    const date = new Date(Date.now() + offset * 3600 * 1000);

    const data = getPlanet(name, date, loc.lat, loc.lon);
    res.json(data);

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ------------------------------------------------------------
// ROUTE HÉLIOCENTRIQUE
// ------------------------------------------------------------
app.get("/api/heliocentric", (req, res) => {
  try {
    let date;

    if (req.query.date) {
      date = new Date(req.query.date);
    } else {
      const offset = Number(req.query.offset || 0);
      date = new Date(Date.now() + offset * 3600 * 1000);
    }

    const planets = getHeliocentricPositions(date);
    res.json(planets);

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ------------------------------------------------------------
// POLARIS
// ------------------------------------------------------------
function getPolarisRA() {
  const now = new Date();
  const JD = (now / 86400000) + 2440587.5;
  const D = JD - 2451545.0;
  const yearsSince2000 = D / 365.25;
  return 2.53 + (0.021 * yearsSince2000);
}

function localSiderealTime(longitude) {
  const now = new Date();
  const JD = (now / 86400000) + 2440587.5;
  const D = JD - 2451545.0;

  let GMST = 18.697374558 + 24.06570982441908 * D;
  GMST = GMST % 24;

  let LST = GMST + longitude / 15;
  return (LST + 24) % 24;
}

function computePolarisData(lat, lon) {
  const lst = localSiderealTime(lon);
  const ra = getPolarisRA();

  let hourAngle = (lst - ra + 24) % 24;

  let scopePos = 18 - (hourAngle / 2);
  scopePos = (scopePos + 12) % 12;

  const angleRad = (scopePos * 30 - 90) * (Math.PI / 180);
  const x = Math.cos(angleRad);
  const y = Math.sin(angleRad);

  return {
    lst: lst.toFixed(4),
    hour_angle: hourAngle.toFixed(4),
    scope_position: scopePos.toFixed(4),
    x: x.toFixed(4),
    y: y.toFixed(4)
  };
}

app.get("/api/polaris/:site", (req, res) => {
  const siteKey = req.params.site.toLowerCase();
  const site = LOCATIONS[siteKey];

  if (!site) {
    return res.status(400).json({ error: "Site non répertorié. Utilisez 'vourles' ou 'lans'." });
  }

  const polarisData = computePolarisData(site.lat, site.lon);

  res.json({
    status: "success",
    site: site.name,
    latitude: site.lat,
    longitude: site.lon,
    ...polarisData,
    timestamp: new Date().toISOString()
  });
});

// ------------------------------------------------------------
// ISS (N2YO)
// ------------------------------------------------------------
app.get("/api/iss/:site", async (req, res) => {
  const siteKey = req.params.site.toLowerCase();
  const site = LOCATIONS[siteKey];

  if (!site) {
    return res.status(400).json({ error: "Site inconnu pour le calcul ISS" });
  }

  const days = 10;
  const minVisibility = 1;
  const satelliteID = 25544;

  const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/${satelliteID}/${site.lat}/${site.lon}/${site.alt}/${days}/${minVisibility}/&apiKey=${N2YO_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Réponse réseau N2YO non valide");

    const data = await response.json();

    res.json({
      site: site.name,
      request_timestamp: new Date().toISOString(),
      ...data
    });

  } catch (error) {
    console.error(`Erreur ISS (${siteKey}):`, error);
    res.status(500).json({
      error: "Erreur de communication avec N2YO",
      details: error.message
    });
  }
});

// ------------------------------------------------------------
// SOLEIL
// ------------------------------------------------------------
app.get("/api/sun", (req, res) => {
  const loc = LOCATIONS.vourles;
  const now = new Date();

  const sun = getSunPosition(now, loc.lat, loc.lon);

  res.json({
    status: "ok",
    ...sun
  });
});

// ------------------------------------------------------------
// LUNE
// ------------------------------------------------------------
app.get("/api/moon", (req, res) => {
  const loc = LOCATIONS.vourles;
  const now = new Date();

  const moon = getMoonPosition(now, loc.lat, loc.lon);

  res.json({
    status: "ok",
    ...moon
  });
});

// ------------------------------------------------------------
// INITIALISATION
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log("--------------------------------------------------");
  console.log(`ASTRO SERVER INITIALISÉ SUR LE PORT : ${PORT}`);
  console.log(`Polaris Vourles : http://localhost:${PORT}/api/polaris/vourles`);
  console.log(`ISS Vourles     : http://localhost:${PORT}/api/iss/vourles`);
  console.log(`Soleil          : http://localhost:${PORT}/api/sun`);
  console.log(`Lune            : http://localhost:${PORT}/api/moon`);
  console.log("--------------------------------------------------");
});
