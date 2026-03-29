// ------------------------------------------------------------
// CALCULS SOLEIL & LUNE (modèle simplifié mais fiable)
// ------------------------------------------------------------
const rad = Math.PI / 180;

function localSiderealTime(date, lon) {
  const JD = (date / 86400000) + 2440587.5;
  const D = JD - 2451545.0;
  let GMST = 18.697374558 + 24.06570982441908 * D;
  GMST = GMST % 24;
  return (GMST + lon / 15 + 24) % 24;
}

// ------------------------------------------------------------
// SOLEIL
// ------------------------------------------------------------
export function getSunPosition(date, lat, lon) {
  const d = (date - new Date(Date.UTC(2000, 0, 1, 12))) / 86400000;

  const L = (280.46 + 0.9856474 * d) % 360;
  const g = (357.528 + 0.9856003 * d) % 360;

  const lambda = L + 1.915 * Math.sin(g * rad) + 0.020 * Math.sin(2 * g * rad);
  const epsilon = 23.439 - 0.0000004 * d;

  const RA = Math.atan2(
    Math.cos(epsilon * rad) * Math.sin(lambda * rad),
    Math.cos(lambda * rad)
  ) / rad;

  const Dec = Math.asin(
    Math.sin(epsilon * rad) * Math.sin(lambda * rad)
  ) / rad;

  const lst = localSiderealTime(date, lon);
  const HA = lst * 15 - RA;

  const alt = Math.asin(
    Math.sin(lat * rad) * Math.sin(Dec * rad) +
    Math.cos(lat * rad) * Math.cos(Dec * rad) * Math.cos(HA * rad)
  ) / rad;

  const az = Math.atan2(
    -Math.sin(HA * rad),
    Math.tan(Dec * rad) * Math.cos(lat * rad) -
    Math.sin(lat * rad) * Math.cos(HA * rad)
  ) / rad;

  return { ra: RA, dec: Dec, alt, az };
}

// ------------------------------------------------------------
// LUNE
// ------------------------------------------------------------
export function getMoonPosition(date, lat, lon) {
  const d = (date - new Date(Date.UTC(2000, 0, 1, 12))) / 86400000;

  const L = (218.316 + 13.176396 * d) % 360;
  const M = (134.963 + 13.064993 * d) % 360;
  const F = (93.272 + 13.229350 * d) % 360;

  const lambda = L + 6.289 * Math.sin(M * rad);
  const beta = 5.128 * Math.sin(F * rad);

  const epsilon = 23.439 - 0.0000004 * d;

  const RA = Math.atan2(
    Math.cos(epsilon * rad) * Math.sin(lambda * rad),
    Math.cos(lambda * rad)
  ) / rad;

  const Dec = Math.asin(
    Math.sin(epsilon * rad) * Math.sin(lambda * rad)
  ) / rad;

  const lst = localSiderealTime(date, lon);
  const HA = lst * 15 - RA;

  const alt = Math.asin(
    Math.sin(lat * rad) * Math.sin(Dec * rad) +
    Math.cos(lat * rad) * Math.cos(Dec * rad) * Math.cos(HA * rad)
  ) / rad;

  const az = Math.atan2(
    -Math.sin(HA * rad),
    Math.tan(Dec * rad) * Math.cos(lat * rad) -
    Math.sin(lat * rad) * Math.cos(HA * rad)
  ) / rad;

  return { ra: RA, dec: Dec, alt, az };
}
