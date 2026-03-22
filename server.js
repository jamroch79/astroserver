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
// API Polaris — EQ6-Pro
// ------------------------------

// Coordonnées des sites
const POLARIS_LOCATIONS = {
  vourles: { lat: 45.6601, lon: 4.7713 },
  lans: { lat: 45.1391, lon: 5.5856 }
};

// Fonction pour interroger l’API PolarScopeAlign
async function getPolarisData(lat, lon) {
  const url = `https://polarscopealign.com/api/polaris?lat=${lat}&lon=${lon}`;
  const r = await fetch(url);
  return await r.json();
}

// Route API Polaris
app.get("/api/polaris/:site", async (req, res) => {
  const site = req.params.site;

  if (!POLARIS_LOCATIONS[site]) {
    return res.status(400).json({ error: "Site inconnu" });
  }

  const { lat, lon } = POLARIS_LOCATIONS[site];

  try {
    const data = await getPolarisData(lat, lon);

    res.json({
      site,
      latitude: lat,
      longitude: lon,
      lst: data.lst,
      hour_angle: data.hour_angle,
      reticle_angle: data.reticle_angle,
      x: data.x,
      y: data.y,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: "Erreur API Polaris", details: e.message });
  }
});

// ------------------------------
// Démarrage serveur
// ------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
