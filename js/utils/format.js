export function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function fmtPrice(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtMarketCap(millions) {
  if (millions === null || millions === undefined || isNaN(millions)) return '—';
  if (millions >= 1e6) return (millions / 1e6).toFixed(2) + 'T';
  if (millions >= 1e3) return (millions / 1e3).toFixed(2) + 'B';
  return millions.toFixed(0) + 'M';
}

export function changeTagHTML(pct, abs, big) {
  const up = (pct ?? 0) >= 0;
  const color = up ? 'var(--gain)' : 'var(--loss)';
  const size = big ? '15px' : '12.5px';
  return `<span class="change-tag" style="color:${color}; font-size:${size};">${up ? '▲' : '▼'} ${up ? '+' : ''}${fmtPrice(abs)} (${up ? '+' : ''}${(pct ?? 0).toFixed(2)}%)</span>`;
}

export function timeAgo(unixSeconds) {
  if (!unixSeconds) return '';
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return mins + ' min';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' h';
  return Math.floor(hours / 24) + ' d';
}

