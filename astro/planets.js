import {
  AstroTime,
  Observer,
  Equator,
  Horizon,
  Body,
  Illumination
} from "astronomy-engine";

import * as Astronomy from "astronomy-engine";   // 🔥 AJOUT CHIRURGICAL

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
// Dec → ° ′ ″
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
// Altitude
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
// Azimut
// ------------------------------------------------------------
function toDMS_Azimuth(deg) {
  const d = Math.floor(deg);
  const mFloat = (deg - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${String(d).padStart(3, '0')}° ${String(m).padStart(2, '0')}′ ${s.toFixed(2)}″`;
}

// ------------------------------------------------------------
// Description de phase
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
// Fonction principale géocentrique
// ------------------------------------------------------------
export function getPlanet(name, date = new Date(), lat = 45.659, lon = 4.793) {
  const body = PLANET_MAP[name.toLowerCase()];
  if (!body) throw new Error("Planète inconnue");

  const time = new AstroTime(date);
  const obs = new Observer(lat, lon, 200);

  const eq = Equator(body, time, obs, true, true);
  const hor = Horizon(time, obs, eq.ra, eq.dec, "normal");
  const illum = Illumination(body, time);

  const alt = hor.altitude;
  const az = hor.azimuth;

  const r = (90 - alt) / 90;
  const theta = az * Math.PI / 180;

  const x = r * Math.sin(theta);
  const y = r * Math.cos(theta);

  return {
    ra_hours: eq.ra,
    ra_hms: toHMS(eq.ra),

    dec_deg: eq.dec,
    dec_dms: toDMS(eq.dec),

    alt_deg: hor.altitude,
    alt_dms: toDMS_Altitude(hor.altitude),

    az_deg: hor.azimuth,
    az_dms: toDMS_Azimuth(hor.azimuth),

    distance_au: eq.dist,
    phase_angle_deg: illum.phase_angle,
    illumination: illum.fraction,
    magnitude: illum.mag,
    phase_description: getPhaseDescription(illum.fraction),

    proj_x: x,
    proj_y: y
  };
}


// ============================================================================
// 🔥 SYSTÈME HÉLIOCENTRIQUE — AJOUT CHIRURGICAL
// ============================================================================

// Coordonnées XY héliocentriques en UA
function computeHeliocentricXY(body, time) {
  const vec = Astronomy.HelioVector(body, time);
  return {
    x: vec.x,
    y: vec.y
  };
}

// Fonction principale héliocentrique
export function getHeliocentricPositions(date = new Date()) {
  const time = new AstroTime(date);

  const bodies = [
    Body.Mercury,
    Body.Venus,
    Body.Earth,
    Body.Mars,
    Body.Jupiter,
    Body.Saturn,
    Body.Uranus,
    Body.Neptune
  ];

  const result = {};

  for (const body of bodies) {
    const pos = computeHeliocentricXY(body, time);
    result[Body[body].toLowerCase()] = pos;
  }

  return {
    sun: { x: 0, y: 0 },
    planets: result
  };
}
