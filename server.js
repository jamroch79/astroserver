import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import { getPlanet, getHeliocentricPositions } from "./astro/planets.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Pour POST JSON
app.use(express.static("public"));

// ------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------
const N2YO_KEY = process.env.N2YO_KEY;

const LOCATIONS = {
  vourles: { lat: 45.6601, lon: 4.7713, alt: 200, name: "Vourles" },
  lans:    { lat: 45.1391, lon: 5.5856, alt: 1000, name: "Lans-en-Vercors" }
};

// ------------------------------------------------------------
// FICHIER JSON POUR SAUVEGARDE DES COMÈTES
// ------------------------------------------------------------
const COMET_FILE = "./data/saved_comets.json";

function loadSavedComets() {
  try {
    return JSON.parse(fs.readFileSync(COMET_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveComets(list) {
  fs.writeFileSync(COMET_FILE, JSON.stringify(list, null, 2));
}

let savedComets = loadSavedComets();

// ------------------------------------------------------------
// ROUTE 1 : RECHERCHE D’UNE COMÈTE (APPEL HORIZONS À LA DEMANDE)
// ------------------------------------------------------------
app.get("/api/comet/search", async (req, res) => {
  const name = req.query.name;
  const site = LOCATIONS.vourles;

  if (!name) {
    return res.status(400).json({ error: "Nom de comète manquant" });
  }

  const date = new Date().toISOString().split("T")[0];

  const url =
    "https://ssd.jpl.nasa.gov/api/horizons.api?format=json" +
    `&COMMAND='${encodeURIComponent(name)}'` +
    "&EPHEM_TYPE='OBSERVER'" +
    "&CENTER='coord@399'" +
    "&COORD_TYPE='GEODETIC'" +
    `&SITE_COORD='${site.lat},${site.lon},${site.alt}'` +
    `&START_TIME='${date}'` +
    `&STOP_TIME='${date}'` +
    "&STEP_SIZE='1 d'";

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.result) {
      return res.status(404).json({ error: "Comète introuvable dans Horizons" });
    }

    // Extraction du nom complet
    const nameMatch = data.result.match(/Target body name:\s*(.+?)\s*{/);
    const fullName = nameMatch ? nameMatch[1].trim() : name;

    // Extraction de la ligne d’éphéméride
    const lines = data.result.split("\n");
    const ephem = lines.find(l => l.match(/\d{4}-\w{3}-\d{2}/));

    if (!ephem) {
      return res.status(404).json({ error: "Aucune donnée éphéméride trouvée" });
    }

    const parts = ephem.trim().split(/\s+/);

    const cometData = {
      name: fullName,
      ra: `${parts[2]} ${parts[3]} ${parts[4]}`,
      dec: `${parts[5]} ${parts[6]} ${parts[7]}`,
      az: parseFloat(parts[12]),
      alt: parseFloat(parts[13]),
      mag: parseFloat(parts[30]) || 99
    };

    res.json({
      status: "ok",
      saved: savedComets.includes(name),
      data: cometData
    });

  } catch (err) {
    res.status(500).json({ error: "Erreur Horizons", details: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE 2 : SAUVEGARDER UNE COMÈTE DANS LE FICHIER JSON
// ------------------------------------------------------------
app.post("/api/comet/save", (req, res) => {
  const name = req.body.name;

  if (!name) {
    return res.status(400).json({ error: "Nom de comète manquant" });
  }

  if (!savedComets.includes(name)) {
    savedComets.push(name);
    saveComets(savedComets);
  }

  res.json({ status: "saved", name });
});

// ------------------------------------------------------------
// ROUTE 3 : LISTER LES COMÈTES SAUVEGARDÉES
// ------------------------------------------------------------
app.get("/api/comet/saved", (req, res) => {
  res.json(savedComets);
});

// ------------------------------------------------------------
// TES ROUTES EXISTANTES (inchangées)
// ------------------------------------------------------------

// PLANÈTES
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

// HÉLIOCENTRIQUE
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

// POLARIS
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
    return res.status(400).json({ error: "Site non répertorié." });
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

// ISS
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
    res.status(500).json({ 
      error: "Erreur de communication avec N2YO",
      details: error.message 
    });
  }
});

// ------------------------------------------------------------
// INITIALISATION
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log("--------------------------------------------------");
  console.log(`ASTRO SERVER INITIALISÉ SUR LE PORT : ${PORT}`);
  console.log("--------------------------------------------------");
});

