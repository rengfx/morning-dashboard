// R47/R49 pressure helpers (pure). Input: Open-Meteo hourly `time` ('YYYY-MM-DDTHH:00', local) and `pressure_msl` (hPa).

const r1 = (v) => Math.round(v * 10) / 10;

/** At index `idx`: hPa now, change over the last 24 h, largest 24-h change in the next 24 h. */
export function pressureAt(time, P, idx) {
  if (!Array.isArray(P) || idx < 0 || P[idx] == null) return null;
  const past = idx >= 24 && P[idx - 24] != null ? r1(P[idx] - P[idx - 24]) : null;
  let next = null;
  for (let k = Math.max(idx + 1, 24); k <= Math.min(P.length - 1, idx + 24); k++) {
    if (P[k] == null || P[k - 24] == null) continue;
    const d24 = r1(P[k] - P[k - 24]);
    if (!next || Math.abs(d24) > Math.abs(next.d24)) next = { d24, at: time[k] };
  }
  return { hPa: Math.round(P[idx]), d24: past, next };
}

/** Hourly values for one local day (24 numbers or nulls). */
export function daySeries(time, P, date) {
  const i0 = Array.isArray(time) ? time.indexOf(`${date}T00:00`) : -1;
  if (i0 < 0 || !Array.isArray(P)) return null;
  return Array.from({ length: 24 }, (_, h) => (P[i0 + h] == null ? null : r1(P[i0 + h])));
}

/** Work hours [start, end] ('HH:MM'): hPa at start, largest 24-h change inside the hours, and the range (max − min). */
export function workPressure(time, P, date, start, end) {
  const i0 = Array.isArray(time) ? time.indexOf(`${date}T00:00`) : -1;
  if (i0 < 0 || !Array.isArray(P)) return null;
  const h0 = Math.floor(+start.slice(0, 2) + +start.slice(3) / 60), h1 = Math.ceil(+end.slice(0, 2) + +end.slice(3) / 60);
  let worst = null, lo = Infinity, hi = -Infinity;
  for (let h = h0; h <= Math.min(23, h1); h++) {
    const k = i0 + h; if (P[k] == null) continue;
    lo = Math.min(lo, P[k]); hi = Math.max(hi, P[k]);
    if (k >= 24 && P[k - 24] != null) { const d24 = r1(P[k] - P[k - 24]); if (!worst || Math.abs(d24) > Math.abs(worst.d24)) worst = { d24, at: time[k] }; }
  }
  if (lo === Infinity) return null;
  return { hPa: Math.round(P[i0 + h0] ?? lo), worst, range: r1(hi - lo) };
}
