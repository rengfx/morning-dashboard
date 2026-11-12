// R22 sky notes markup, shared by the Today and Sky pages.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const SKY = { cloudy: 'CLOUDY · MAY NOT BE VISIBLE', partly: 'PARTLY CLOUDY', clear: 'CLEAR', unknown: '' };

/** Returns '' when there is nothing worth seeing. */
export function skyNotesHtml(events, { link = null, title = 'SKY · NEXT 4 DAYS' } = {}) {
  if (!events || !events.length) return '';
  const rows = events.map((e) => {
    const [, m, d] = e.date.split('-').map(Number);
    const cloud = e.cloud != null ? ` ${e.cloud}%` : '';
    return `<li class="${e.sky}"><span class="t">${esc(e.weekday)} ${d} ${MON[m - 1]}<br>${esc(e.time)}</span><span class="n">${esc(e.title)}<small>${esc(e.detail)}</small>${SKY[e.sky] ? `<em>${esc(SKY[e.sky])}${e.sky !== 'clear' ? esc(cloud) : ''}</em>` : ''}</span></li>`;
  }).join('');
  return `<section class="sec skynotes"><div class="row"><span>${esc(title)}</span>${link ? `<a href="${esc(link)}">SKY ↗</a>` : ''}</div><ul>${rows}</ul></section>`;
}
