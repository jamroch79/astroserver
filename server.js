import express from "express";
import fetch from "node-fetch";
import { planetposition, sexa, coord, data, julian } from "astronomia";

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// CONFIGURATION ET CLÉS
// ------------------------------------------------------------
const N2YO_KEY = process.env.N2YO_KEY;

app.use(express.static("public"));

const LOCATIONS = {
  vourles: { 
    lat: 45.6601, 
    lon: 4.7713, 
    alt: 200,
    name: "Vourles" 
  },
  lans: { 
    lat: 45.1391, 
    lon: 5.5856, 
    alt: 1000,
    name: "Lans-en-Vercors" 
  }
};

// ------------------------------------------------------------
// MOTEUR DE CALCUL ASTRONOMIQUE (POLARIS)
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

// ------------------------------------------------------------
// ROUTES API - POLARIS
// ------------------------------------------------------------

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
// ROUTES API - TRANSITS ISS (N2YO)
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
    console.error(`Erreur lors de la récupération ISS pour ${siteKey}:`, error);
    res.status(500).json({ 
      error: "Erreur de communication avec le service N2YO",
      details: error.message 
    });
  }
});

// ------------------------------------------------------------
// ROUTE API - POSITION TEMPS RÉEL D’UNE PLANÈTE
// ------------------------------------------------------------

app.get("/api/planet/position/:planet/:site", (req, res) => {
  const planetName = req.params.planet.toLowerCase();
  const siteKey = req.params.site.toLowerCase();
  const site = LOCATIONS[siteKey];

  if (!site) {
    return res.status(400).json({ error: "Site inconnu. Utilisez 'vourles' ou 'lans'." });
  }

  const planets = {
    mercury: data.mercury,
    venus: data.venus,
    mars: data.mars,
    jupiter: data.jupiter,
    saturn: data.saturn,
    uranus: data.uranus,
    neptune: data.neptune
  };

  if (!planets[planetName]) {
    return res.status(400).json({ error: "Planète inconnue." });
  }

  try {
    const earth = new planetposition.Planet(data.earth);
    const target = new planetposition.Planet(planets[planetName]);

    const now = new Date();
    const jd = julian.DateToJD(now);

    const { ra, dec, range } = planetposition.position(earth, target, jd);

    const observer = new coord.Observer(site.lat, site.lon, 0);
    const eq = new coord.Equatorial(ra, dec);
    const hor = coord.eqToHor(eq, observer, jd);

    const altDeg = hor.alt * 180 / Math.PI;
    const azDeg = hor.az * 180 / Math.PI;

    res.json({
      status: "success",
      planet: planetName,
      site: site.name,
      altitude_deg: altDeg,
      azimut_deg: azDeg,
      ra_hours: ra,
      dec_deg: dec * 180 / Math.PI,
      distance_au: range,
      visible: altDeg > 0,
      timestamp: now.toISOString()
    });

  } catch (err) {
    res.status(500).json({ error: "Erreur de calcul astronomique", details: err.message });
  }
});

// ------------------------------------------------------------
// INITIALISATION DU SERVEUR
// ------------------------------------------------------------

app.listen(PORT, () => {
  console.log("--------------------------------------------------");
  console.log(`ASTRO SERVER INITIALISÉ SUR LE PORT : ${PORT}`);
  console.log(`Lien Polaris Vourles : http://localhost:${PORT}/api/polaris/vourles`);
  console.log(`Lien Polaris Lans    : http://localhost:${PORT}/api/polaris/lans`);
  console.log(`Lien ISS Vourles     : http://localhost:${PORT}/api/iss/vourles`);
  console.log("--------------------------------------------------");
});
