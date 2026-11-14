// R32 True horizon from the end of Venice Pier (33.9761, -118.4710, eye 7 m above the sea).
// Built once from Copernicus GLO-90 terrain heights (Open-Meteo elevation API): rays every 3°,
// 1 km steps to 30 km, 3 km steps to 99 km; Earth curve and refraction (k = 0.13) applied.
// alt[i] = horizon height (degrees) at azimuth i*3°. 0 = open sea.
export const HORIZON = { step: 3, alt: [1.45, 1.46, 1.32, 1.21, 1.19, 1.4, 1.27, 1.36, 1.67, 1.32, 1.62, 2.04, 1.86, 1.55, 1.64, 1.41, 1.89, 1.78, 1.6, 1.62, 1.36, 1.5, 1.38, 1.11, 0.9, 0.52, 0.65, 0.52, 0.37, 0.29, 0.29, 0.31, 0.43, 0.48, 0.5, 0.45, 0.59, 0.66, 0.6, 0.54, 0.47, 0.4, 0.46, 0.54, 0.41, 0.34, 0.4, 0.35, 0.24, 0.28, 0.24, 0.61, 0.73, 0.74, 0.68, 0.37, 0.04, 0, 0.13, 0.06, 0.01, 0, 0.06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.32, 0.58, 0.82, 1.08, 1.21, 1.36, 1.59, 1.99, 1.92, 2.03, 1.54, 1.65, 1.82, 1.29, 1.54, 1.81, 2.19, 2.09, 2.05, 1.48, 1.77, 1.97, 1.75, 1.95, 1.56, 1.43], built: '2026-11-13/14 · all 120 rays measured' };

/** Horizon height (deg) at any azimuth, linear between the 3° rays. */
export function horizonAt(az) {
  const n = HORIZON.alt.length, u = ((((az % 360) + 360) % 360) / HORIZON.step), i = Math.floor(u) % n, j = (i + 1) % n;
  return HORIZON.alt[i] + (HORIZON.alt[j] - HORIZON.alt[i]) * (u - Math.floor(u));
}
