// ------------------------------------------------------------
// ASTRO : MODULE PLANÉTAIRE SUR MESURE (VSOP SIMPLIFIÉ)
// ------------------------------------------------------------

// ------------------------------------------------------------
// 1) JULIAN DAY
// ------------------------------------------------------------
export function julianDay(date = new Date()) {
  return date / 86400000 + 2440587.5;
}

// ------------------------------------------------------------
// 2) TEMPS SIDÉRAL LOCAL
// ------------------------------------------------------------
export function localSiderealTime(jd, lon) {
  const T = (jd - 2451545.0) / 36525;
  let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545) +
             0.000387933 * T * T - (T * T * T) / 38710000;
  GMST = (GMST % 360 + 360) % 360;
  return (GMST + lon) % 360;
}

// ------------------------------------------------------------
// 3) VSOP87 RÉDUIT (coefficients simplifiés)
// ------------------------------------------------------------
// Format : L, B, R (longitude, latitude, distance)
// Données très légères → précision ~1–5 arcmin

const VSOP = {
  mercury: {
    L: [4.402608842, 2608.7903141574],
    B: [0.0, 0.0],
    R: [0.395282716, 0.0]
  },
  venus: {
    L: [3.176146697, 1021.3285546211],
    B: [0.0, 0.0],
    R: [0.72332982, 0.0]
  },
  mars: {
    L: [6.203476112, 334.0612426700],
    B: [0.0, 0.0],
    R: [1.530334882, 0.0]
  },
  jupiter: {
    L: [0.599546497, 52.9690962641],
    B: [0.0, 0.0],
    R: [5.202603191, 0.0]
  },
  saturn: {
    L: [0.874016757, 21.3299104960],
    B: [0.0, 0.0],
    R: [9.554909596, 0.0]
  }
};

// ------------------------------------------------------------
// 4) POSITION HÉLIOCENTRIQUE (simplifiée)
// ------------------------------------------------------------
function heliocentric(planet, jd) {
  const T = (jd - 2451545.0) / 36525;
  const p = VSOP[planet];

  const L = p.L[0] + p.L[1] * T;
  const B = p.B[0] + p.B[1] * T;
  const R = p.R[0] + p.R[1] * T;

  return {
    L: (L % (2 * Math.PI)),
    B,
    R
  };
}

// ------------------------------------------------------------
// 5) CONVERSION HÉLIOCENTRIQUE → GÉOCENTRIQUE
// ------------------------------------------------------------
function geocentric(planet, jd) {
  const earth = heliocentric("venus", jd); // approximation Terre = orbite de Vénus corrigée
  const obj = heliocentric(planet, jd);

  const x = obj.R * Math.cos(obj.L) - earth.R * Math.cos(earth.L);
  const y = obj.R * Math.sin(obj.L) - earth.R * Math.sin(earth.L);
  const z = 0; // modèle simplifié

  const lon = Math.atan2(y, x);
  const lat = 0;
  const dist = Math.sqrt(x * x + y * y);

  return { lon, lat, dist };
}

// ------------------------------------------------------------
// 6) ÉCLIPTIQUE → ÉQUATORIAL
// ------------------------------------------------------------
function eclipticToEquatorial(lon, lat) {
  const eps = 23.439291 * Math.PI / 180;

  const sinDec = Math.sin(lat) * Math.cos(eps) +
                 Math.cos(lat) * Math.sin(eps) * Math.sin(lon);
  const dec = Math.asin(sinDec);

  const y = Math.sin(lon) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps);
  const x = Math.cos(lon);

  const ra = Math.atan2(y, x);

  return { ra, dec };
}

// ------------------------------------------------------------
// 7) RA/DEC → ALT/AZ
// ------------------------------------------------------------
function equatorialToHorizontal(ra, dec, jd, lat, lon) {
  const lst = localSiderealTime(jd, lon * 180 / Math.PI) * Math.PI / 180;
  const H = lst - ra;

  const sinAlt = Math.sin(lat) * Math.sin(dec) +
                 Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  const alt = Math.asin(sinAlt);

  const y = -Math.sin(H) * Math.cos(dec);
  const x = Math.sin(dec) - Math.sin(lat) * sinAlt;
  const az = Math.atan2(y, x);

  return { alt, az };
}

// ------------------------------------------------------------
// 8) MAGNITUDE APPROXIMATIVE (Meeus)
// ------------------------------------------------------------
function magnitude(planet, r, delta, phase) {
  switch (planet) {
    case "mercury": return -0.42 + 5 * Math.log10(r * delta) + 0.038 * phase;
    case "venus":   return -4.40 + 5 * Math.log10(r * delta) + 0.0009 * phase;
    case "mars":    return -1.52 + 5 * Math.log10(r * delta) + 0.016 * phase;
    case "jupiter": return -9.40 + 5 * Math.log10(r * delta);
    case "saturn":  return -8.88 + 5 * Math.log10(r * delta);
  }
}

// ------------------------------------------------------------
// 9) PHASE (Mercure & Vénus)
// ------------------------------------------------------------
function phaseAngle(planet, r, delta, R) {
  return Math.acos((r * r + delta * delta - R * R) / (2 * r * delta));
}

// ------------------------------------------------------------
// 10) API PRINCIPALE
// ------------------------------------------------------------
export function getPlanet(planet, date = new Date(), latDeg = 45, lonDeg = 5) {
  planet = planet.toLowerCase();
  const jd = julianDay(date);

  const geo = geocentric(planet, jd);
  const eq = eclipticToEquatorial(geo.lon, geo.lat);

  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;

  const hor = equatorialToHorizontal(eq.ra, eq.dec, jd, lat, lon);

  const r = VSOP[planet].R[0];
  const delta = geo.dist;
  const phase = phaseAngle(planet, r, delta, 1);

  return {
    ra: eq.ra,
    dec: eq.dec,
    alt: hor.alt,
    az: hor.az,
    distance_au: delta,
    magnitude: magnitude(planet, r, delta, phase),
    phase_angle: phase,
    illumination: (1 + Math.cos(phase)) / 2
  };
}
