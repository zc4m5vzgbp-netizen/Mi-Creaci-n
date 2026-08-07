import { state } from '../state.js';
import { safeSetItem } from '../utils/storage.js';
import { computePositionSize, computeRiskReward } from '../analysis/riskEngine.js';

const inputStyle = 'width:100%; background:var(--surface-alt); border:1px solid var(--hairline); border-radius:6px; padding:7px; color:var(--paper); font-family:inherit; font-size:14px; margin-top:4px;';

export function renderRiskCard() {
  const card = document.getElementById('riskCard');
  if (!card) return;
  const s = state.cache[state.selected];
  const ind = state.indicatorsCache[state.selected];
  const currentPrice = s && s.price != null ? s.price : null;

  let suggestedStop = null, suggestedTarget = null;
  if (ind && ind.priceAction) {
    if (ind.priceAction.nearestSupport) suggestedStop = ind.priceAction.nearestSupport.price;
    if (ind.priceAction.nearestResistance) suggestedTarget = ind.priceAction.nearestResistance.price;
  }
  if (suggestedStop == null && currentPrice != null && ind && ind.atr14) suggestedStop = currentPrice - ind.atr14 * 2;
  if (suggestedTarget == null && currentPrice != null && ind && ind.atr14) suggestedTarget = currentPrice + ind.atr14 * 2;

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:4px;">Motor de Gestión de Riesgo</div>
    <div class="dim" style="font-size:11px; margin-bottom:12px; line-height:1.4;">Calculadora con tus propios números — no es una recomendación de cuánto arriesgar.</div>
    <div class="stat-grid">
      <div class="stat-box"><div class="dim">Capital total ($)</div><input type="number" id="riskCapitalInput" value="${state.riskCapital || ''}" placeholder="10000" style="${inputStyle}"/></div>
      <div class="stat-box"><div class="dim">Riesgo por operación (%)</div><input type="number" id="riskPctInput" value="${state.riskPct || 1}" step="0.1" style="${inputStyle}"/></div>
    </div>
    <div class="stat-grid" style="margin-top:8px;">
      <div class="stat-box"><div class="dim">Precio de entrada</div><input type="number" id="riskEntryInput" value="${currentPrice != null ? currentPrice.toFixed(2) : ''}" style="${inputStyle}"/></div>
      <div class="stat-box"><div class="dim">Stop Loss</div><input type="number" id="riskStopInput" value="${suggestedStop != null ? suggestedStop.toFixed(2) : ''}" style="${inputStyle}"/></div>
    </div>
    <div class="stat-grid" style="margin-top:8px;">
      <div class="stat-box"><div class="dim">Take Profit</div><input type="number" id="riskTargetInput" value="${suggestedTarget != null ? suggestedTarget.toFixed(2) : ''}" style="${inputStyle}"/></div>
      <div class="stat-box"><div class="dim">Operaciones hoy</div><input type="number" id="riskTradesInput" value="1" min="1" step="1" style="${inputStyle}"/></div>
    </div>
    <button class="btn-primary" style="margin-top:12px; width:100%;" onclick="calculateRisk()">Calcular</button>
    <div id="riskResultsBox" style="margin-top:12px;"></div>
    ${(suggestedStop != null || suggestedTarget != null) ? '<div class="dim" style="font-size:10.5px; margin-top:8px;">Stop y Take Profit precargados desde tus zonas reales de oferta/demanda (o ATR si no hay zona cercana) — cámbialos si prefieres otros niveles.</div>' : ''}
  `;
}

export function calculateRiskResults() {
  const resultsBox = document.getElementById('riskResultsBox');
  const capital = parseFloat(document.getElementById('riskCapitalInput').value);
  const riskPct = parseFloat(document.getElementById('riskPctInput').value);
  const entry = parseFloat(document.getElementById('riskEntryInput').value);
  const stop = parseFloat(document.getElementById('riskStopInput').value);
  const target = parseFloat(document.getElementById('riskTargetInput').value);
  const trades = parseInt(document.getElementById('riskTradesInput').value, 10) || 1;

  if (!capital || !riskPct || !entry || !stop) {
    resultsBox.innerHTML = '<div style="color:var(--loss); font-size:13px;">Completa capital, riesgo %, precio de entrada y Stop Loss.</div>';
    return;
  }
  if (entry === stop) {
    resultsBox.innerHTML = '<div style="color:var(--loss); font-size:13px;">El precio de entrada y el Stop Loss no pueden ser iguales.</div>';
    return;
  }

  state.riskCapital = capital;
  state.riskPct = riskPct;
  safeSetItem('risk_capital', JSON.stringify(capital));
  safeSetItem('risk_pct', JSON.stringify(riskPct));

  const pos = computePositionSize(capital, riskPct, entry, stop);
  if (!pos) {
    resultsBox.innerHTML = '<div style="color:var(--loss); font-size:13px;">No se pudo calcular con esos números.</div>';
    return;
  }

  let rrHtml = '';
  if (target) {
    const rr = computeRiskReward(entry, stop, target);
    if (rr) {
      const rrClass = rr.ratio >= 2 ? 'tag-good' : (rr.ratio >= 1 ? 'tag-neutral' : 'tag-bad');
      rrHtml = `<div class="indicator-row"><div class="indicator-label">Relación Riesgo / Beneficio</div><div class="mono ${rrClass}">1 : ${rr.ratio.toFixed(2)}</div></div>`;
    }
  }

  resultsBox.innerHTML = `
    <div class="indicator-row"><div class="indicator-label">Riesgo por operación</div><div class="mono tag-bad">$${pos.dollarRisk.toFixed(2)}</div></div>
    <div class="indicator-row"><div class="indicator-label">Tamaño de posición sugerido</div><div class="mono">${pos.shares} acciones</div></div>
    <div class="indicator-row"><div class="indicator-label">Costo total de la posición</div><div class="mono">$${pos.positionCost.toFixed(2)}</div></div>
    ${rrHtml}
    <div class="indicator-row"><div class="indicator-label">Riesgo total si haces ${trades} operación(es) así</div><div class="mono">$${(pos.dollarRisk * trades).toFixed(2)}</div></div>
    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">No llevamos un registro de tus operaciones reales del día — este "riesgo total" es solo una referencia si repites este mismo tamaño de riesgo. Esta es una calculadora con tus propios números, no asesoría financiera ni una recomendación de cuánto arriesgar.</div>
  `;
}
