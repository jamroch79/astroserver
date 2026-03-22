import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------
// Clé N2YO
// ------------------------------
const N2YO_KEY = process.env.N2YO_KEY;

// ------------------------------
// Dossier des fichiers HTML
// ------------------------------
app.use(express.static("public"));

// ------------------------------
// API ISS — Vourles
// ------------------------------
app.get("/api/iss/vourles", async (req, res) => {
  const lat = 45.6601;
  const lng = 4.7713;
  const alt = 200;
  const days = 10;
  const minVisibility = 1;

  const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/25544/${lat}/${lng}/${alt}/${days}/${minVisibility}/&apiKey=${N2YO_KEY}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Erreur N2YO Vourles" });
  }
});

// ------------------------------
// API ISS — Lans-en-Vercors
// ------------------------------
app.get("/api/iss/lans", async (req, res) => {
  const lat = 45.1391;
  const lng = 5.5856;
  const alt = 1000;
  const days = 10;
  const minVisibility = 1;

  const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/25544/${lat}/${lng}/${alt}/${days}/${minVisibility}/&apiKey=${N2YO_KEY}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Erreur N2YO Lans" });
  }
});

// ------------------------------
// API Polaris locale (sans API externe)
// ------------------------------

// Coordonnées des sites
const POLARIS_LOCATIONS = {
  vourles: { lat: 45.6601, lon: 4.7713 },
  lans: { lat: 45.1391, lon: 5.5856 }
};

// RA/Dec de Polaris (2025)
const POLARIS_RA = 2.530301028;   // en heures
const POLARIS_DEC = 89.264109444; // en degrés

// Temps sidéral local
function localSiderealTime(longitude) {
  const now = new Date();
  const JD = (now / 86400000) + 2440587.5;
  const D = JD - 2451545.0;

  let GMST = 18.697374558 + 24.06570982441908 * D;
  GMST = GMST % 24;

  let LST = GMST + longitude / 15;
  if (LST < 0) LST += 24;
  if (LST >= 24) LST -= 24;

  return LST;
}

// Calcul Polaris dans le viseur EQ6
function computePolaris(lat, lon) {
  const lst = localSiderealTime(lon);

  // Angle horaire de Polaris
  let hourAngle = lst - POLARIS_RA;
  if (hourAngle < 0) hourAngle += 24;

  // Rotation du réticule EQ6 (simple : 15° par heure)
  const reticleAngle = (hourAngle * 15) % 360;

  // Position brute sur le cercle (x,y)
  const angleRad = (hourAngle / 12) * Math.PI * 2;
  const x = Math.sin(angleRad);
  const y = Math.cos(angleRad);

  // Position Polaris dans le viseur (en heures)
  const scopePos = hourAngle % 12;

  return {
    lst,
    hour_angle: hourAngle,
    reticle_angle: reticleAngle,
    x,
    y,
    scope_position: scopePos
  };
}

// Route API Polaris
app.get("/api/polaris/:site", (req, res) => {
  const site = req.params.site;

  if (!POLARIS_LOCATIONS[site]) {
    return res.status(400).json({ error: "Site inconnu" });
  }

  const { lat, lon } = POLARIS_LOCATIONS[site];
  const data = computePolaris(lat, lon);

  res.json({
    site,
    latitude: lat,
    longitude: lon,
    ...data,
    timestamp: new Date().toISOString()
  });
});

// ------------------------------
// Démarrage serveur
// ------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
