import { state } from '../state.js';
import { computePerformanceForPeriod, PERFORMANCE_PERIODS, PERIOD_LABELS } from '../analysis/performanceEngine.js';

function buildSparklineSVG(closes, color) {
  if (!closes || closes.length < 2) return '';
  const w = 300, h = 64, pad = 4;
  const min = Math.min.apply(null, closes);
  const max = Math.max.apply(null, closes);
  const range = max - min || 1;
  const points = closes.map((c, i) => {
    const x = pad + (i / (closes.length - 1)) * (w - pad * 2);
    const y = h - pad - ((c - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaPoints = `${pad},${h} ${points} ${w - pad},${h}`;
  return `
    <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;">
      <polyline points="${areaPoints}" fill="${color}" fill-opacity="0.12" stroke="none" />
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  `;
}

export function renderPerformanceCard() {
  const card = document.getElementById('performanceCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="toggle-label" style="margin-bottom:8px;">Rendimiento</div><div class="dim" style="font-size:11px;">Analiza primero.</div>`;
    return;
  }
  if (data.error || !data.ohlc || data.ohlc.length < 2) { card.innerHTML = ''; return; }

  const closes = data.ohlc.map((c) => c.close);
  const period = state.perfPeriod || '1M';
  const perf = computePerformanceForPeriod(closes, period);
  if (!perf) { card.innerHTML = ''; return; }

  const up = perf.pct >= 0;
  const color = up ? 'var(--gain)' : 'var(--loss)';
  const sparkline = buildSparklineSVG(perf.series, color);
  const tabsHtml = PERFORMANCE_PERIODS.map((p) =>
    `<button class="perf-period-btn ${p === period ? 'active' : ''}" onclick="selectPerformancePeriod('${p}')">${p}</button>`
  ).join('');

  card.innerHTML = `
    <div class="toggle-label" style="margin-bottom:10px;">Rendimiento</div>
    <div class="mono" style="font-size:26px; font-weight:700; color:${color};">${up ? '+' : ''}${perf.pct.toFixed(2)}%</div>
    <div class="dim" style="font-size:11px; margin-bottom:10px;">Variación en ${PERIOD_LABELS[period]} (${perf.days} días de cotización)</div>
    ${sparkline}
    <div class="perf-period-tabs" style="margin-top:12px;">${tabsHtml}</div>
  `;
}
