import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// CONFIGURATION ET CLÉS
// ------------------------------------------------------------
// Ta clé API N2YO doit être définie dans tes variables d'environnement
const N2YO_KEY = process.env.N2YO_KEY;

// Dossier public pour tes fichiers HTML/JS (ton interface client)
app.use(express.static("public"));

// Coordonnées précises des sites d'observation
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

/**
 * Calcule l'Ascension Droite (RA) de la Polaire pour l'instant T.
 * Prend en compte la précession annuelle pour garantir la précision en 2026.
 */
function getPolarisRA() {
  const now = new Date();
  const JD = (now / 86400000) + 2440587.5;
  const D = JD - 2451545.0;
  const yearsSince2000 = D / 365.25;
  // Dérive séculaire de la Polaire (~0.021h par an)
  return 2.53 + (0.021 * yearsSince2000);
}

/**
 * Calcule le Temps Sidéral Local (LST) pour une longitude donnée.
 */
function localSiderealTime(longitude) {
  const now = new Date();
  const JD = (now / 86400000) + 2440587.5;
  const D = JD - 2451545.0;

  let GMST = 18.697374558 + 24.06570982441908 * D;
  GMST = GMST % 24;

  let LST = GMST + longitude / 15;
  return (LST + 24) % 24;
}

/**
 * Calcule les coordonnées de mise en station (HA et P-Scope).
 * Intègre l'offset mécanique de -1.48 pour les réticules Sky-Watcher récents.
 */
function computePolarisData(lat, lon) {
  const lst = localSiderealTime(lon);
  const ra = getPolarisRA();

  // Angle horaire (HA) - Position réelle dans le ciel
  let hourAngle = (lst - ra + 24) % 24;

  // Position dans le viseur (P-Scope)
  // Division par 2 pour cadran 12h ET application de l'offset de calibration
  let scopePos = (hourAngle / 2) - 1.48;
  scopePos = (scopePos + 12) % 12;

  // Calcul des coordonnées cartésiennes pour un affichage graphique (Canvas)
  // Le -90 degrés sert à placer le "midi" (0h/12h) en haut du cercle
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
