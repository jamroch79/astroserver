import {
  AstroTime,
  Observer,
  Equator,
  Horizon,
  Body,
  Illumination
} from "astronomy-engine";

const PLANET_MAP = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto
};


// ------------------------------------------------------------
// RA → h m s
// ------------------------------------------------------------
function toHMS(hours) {
  const h = Math.floor(hours);
  const mFloat = (hours - h) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${s.toFixed(2)}s`;
}

// ------------------------------------------------------------
// Dec → ° ′ ″ (avec signe)
// ------------------------------------------------------------
function toDMS(deg) {
  const sign = deg >= 0 ? "+" : "-";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′ ${s.toFixed(2)}″`;
}

// ------------------------------------------------------------
// Altitude → ° ′ ″ (avec signe)
// ------------------------------------------------------------
function toDMS_Altitude(deg) {
  const sign = deg >= 0 ? "+" : "-";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′ ${s.toFixed(2)}″`;
}

// ------------------------------------------------------------
// Azimut → ° ′ ″ (0–360°, pas de signe)
// ------------------------------------------------------------
function toDMS_Azimuth(deg) {
  const d = Math.floor(deg);
  const mFloat = (deg - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${String(d).padStart(3, '0')}° ${String(m).padStart(2, '0')}′ ${s.toFixed(2)}″`;
}

// ------------------------------------------------------------
// Description lisible de la phase (croissant, gibbeuse, etc.)
// ------------------------------------------------------------
function getPhaseDescription(f) {
  if (f < 0.1) return "Très fin croissant";
  if (f < 0.25) return "Croissant";
  if (f < 0.45) return "Premier quartier";
  if (f < 0.55) return "Demi-phase";
  if (f < 0.75) return "Gibbeuse";
  return "Pleine phase";
}

// ------------------------------------------------------------
// Fonction principale
// ------------------------------------------------------------
export function getPlanet(name, date = new Date(), lat = 45.659, lon = 4.793) {
  const body = PLANET_MAP[name.toLowerCase()];
  if (!body) throw new Error("Planète inconnue");

  const time = new AstroTime(date);
  const obs = new Observer(lat, lon, 200);

  const eq = Equator(body, time, obs, true, true);
  const hor = Horizon(time, obs, eq.ra, eq.dec, "normal");
  const illum = Illumination(body, time);

// Projection azimutale simple (planisphère)
const alt = hor.altitude;
const az = hor.azimuth;

const r = (90 - alt) / 90;          // 0 = zénith, 1 = horizon
const theta = az * Math.PI / 180;

const x = r * Math.cos(theta);
const y = r * Math.sin(theta);

  return {
    // RA
    ra_hours: eq.ra,
    ra_hms: toHMS(eq.ra),

    // Dec
    dec_deg: eq.dec,
    dec_dms: toDMS(eq.dec),

    // Altitude
    alt_deg: hor.altitude,
    alt_dms: toDMS_Altitude(hor.altitude),

    // Azimut
    az_deg: hor.azimuth,
    az_dms: toDMS_Azimuth(hor.azimuth),

    // Photométrie
    distance_au: eq.dist,
    phase_angle_deg: illum.phase_angle,
    illumination: illum.fraction,
    magnitude: illum.mag,
    phase_description: getPhaseDescription(illum.fraction),

    // Projection planisphère
    proj_x: x,
    proj_y: y
  };
}
