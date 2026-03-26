// astro.js
import {
  AstroTime,
  Observer,
  Equator,
  Horizon,
  Body
} from "astronomy-engine";

const PLANET_MAP = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn
};

// -----------------------------
// Conversion RA → h m s
// -----------------------------
function toHMS(hours) {
  const h = Math.floor(hours);
  const mFloat = (hours - h) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${s.toFixed(2)}s`;
}

// -----------------------------
// Conversion Dec → ° ′ ″
// -----------------------------
function toDMS(deg) {
  const sign = deg >= 0 ? "+" : "-";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′ ${s.toFixed(2)}″`;
}

export function getPlanet(name, date = new Date(), lat = 45.659, lon = 4.793) {
  const body = PLANET_MAP[name.toLowerCase()];
  if (!body) throw new Error("Planète inconnue");

  const time = new AstroTime(date);
  const obs = new Observer(lat, lon, 200);

  const eq = Equator(body, time, obs, true, true);
  const hor = Horizon(time, obs, eq.ra, eq.dec, "normal");

  return {
    ra_hours: eq.ra,
    ra_hms: toHMS(eq.ra),

    dec_deg: eq.dec,
    dec_dms: toDMS(eq.dec),

    alt_deg: hor.altitude,
    az_deg: hor.azimuth,
    distance_au: eq.dist,
    phase_angle_deg: eq.phase,
    illumination: eq.illum
  };
}
