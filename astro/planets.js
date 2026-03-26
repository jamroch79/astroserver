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

export function getPlanet(name, date = new Date(), lat = 45.659, lon = 4.793) {
  const body = PLANET_MAP[name.toLowerCase()];
  if (!body) throw new Error("Planète inconnue");

  const time = new AstroTime(date);
  const obs = new Observer(lat, lon, 200);

  const eq = Equator(body, time, obs, true, true);
  const hor = Horizon(time, obs, eq.ra, eq.dec, "normal");

  return {
    ra_hours: eq.ra,
    ra_deg: eq.ra * 15,
    dec_deg: eq.dec,
    alt_deg: hor.altitude,
    az_deg: hor.azimuth,
    distance_au: eq.dist,
    phase_angle_deg: eq.phase,
    illumination: eq.illum
  };
}
