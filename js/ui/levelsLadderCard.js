import { state } from '../state.js';
import { fmtPrice } from '../utils/format.js';

function levelRow(level, isResistance, barPct, isNearest) {
  const colorVar = isResistance ? 'var(--loss)' : 'var(--gain)';
  const icon = isResistance ? '▲' : '▼';
  const cls = isResistance ? 'tag-bad' : 'tag-good';
  return `
    <div class="level-row ${isNearest ? 'level-nearest' : ''}">
      <div class="level-row-top">
        <span class="dim mono" style="font-size:10px;">${icon} ${level.label}${isNearest ? ' · más cercano' : ''}</span>
        <span class="mono ${cls}" style="font-size:12.5px; font-weight:600;">$${fmtPrice(level.price)}</span>
      </div>
      <div class="level-bar-track"><div class="level-bar-fill" style="width:${barPct}%; background:${colorVar};"></div></div>
    </div>
  `;
}

export function renderLevelsLadder() {
  const card = document.getElementById('levelsLadderCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="toggle-label" style="margin-bottom:8px;">Niveles Clave</div><div class="dim" style="font-size:11px;">Analiza primero.</div>`;
    return;
  }
  if (data.error || !data.pivotPoints) { card.innerHTML = ''; return; }
  const pp = data.pivotPoints;
  const price = data.lastClose;

  const resistances = [{ label: 'R1', price: pp.r1 }, { label: 'R2', price: pp.r2 }, { label: 'R3', price: pp.r3 }];
  const supports = [{ label: 'S1', price: pp.s1 }, { label: 'S2', price: pp.s2 }, { label: 'S3', price: pp.s3 }];
  const allLevels = resistances.concat(supports);
  const distances = allLevels.map((l) => Math.abs(l.price - price));
  const maxDist = Math.max.apply(null, distances);
  const minDist = Math.min.apply(null, distances);

  function bar(level) {
    const dist = Math.abs(level.price - price);
    return maxDist > 0 ? Math.max(15, 100 * (1 - dist / maxDist)) : 100;
  }
  function nearest(level) {
    return Math.abs(level.price - price) === minDist;
  }

  card.innerHTML = `
    <div class="toggle-label" style="margin-bottom:8px;">Niveles Clave</div>
    <div class="dim mono" style="font-size:9px; letter-spacing:1px; margin-bottom:4px;">RESISTENCIA</div>
    ${resistances.slice().reverse().map((l) => levelRow(l, true, bar(l), nearest(l))).join('')}
    <div class="level-current-row">
      <span class="mono" style="font-size:10.5px; font-weight:700;">● AHORA</span>
      <span class="mono" style="font-size:14px; font-weight:700;">$${fmtPrice(price)}</span>
    </div>
    <div class="dim mono" style="font-size:9px; letter-spacing:1px; margin:4px 0;">SOPORTE</div>
    ${supports.map((l) => levelRow(l, false, bar(l), nearest(l))).join('')}
    <div class="dim" style="font-size:9px; margin-top:8px; line-height:1.3; font-style:italic;">Puntos Pivote clásicos, sobre el cierre de ayer. La barra muestra qué tan cerca está cada nivel del precio actual.</div>
  `;
}
