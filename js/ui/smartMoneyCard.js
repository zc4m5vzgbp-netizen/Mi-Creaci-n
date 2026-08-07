import { state } from '../state.js';
import { fmtPrice } from '../utils/format.js';

function row(label, caption, valueHtml, signalClass) {
  return `<div class="indicator-row"><div><div class="indicator-label">${label}</div><div class="indicator-caption">${caption}</div></div><div style="text-align:right;"><div class="mono ${signalClass}" style="font-size:13px;">${valueHtml}</div></div></div>`;
}

export function renderSmartMoney() {
  const card = document.getElementById('smartMoneyCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Motor de Smart Money</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores — toca "Analizar" arriba.</div>`;
    return;
  }
  if (data.error || !data.smartMoney) { card.innerHTML = ''; return; }

  const sm = data.smartMoney;
  const rows = [];

  if (sm.structure) {
    const st = sm.structure;
    const structClass = st.structure === 'alcista' ? 'tag-good' : (st.structure === 'bajista' ? 'tag-bad' : 'tag-neutral');
    rows.push(row('Estructura de mercado', 'Basada en máximos y mínimos recientes.', st.structure, structClass));
    if (st.event) {
      const evClass = st.event.type === 'BOS' ? (st.event.direction.includes('alcista') ? 'tag-good' : 'tag-bad') : 'tag-neutral';
      rows.push(row(st.event.type === 'BOS' ? 'BOS (rompimiento de estructura)' : 'CHoCH (cambio de carácter)', st.event.desc, st.event.direction, evClass));
    } else {
      rows.push(row('BOS / CHoCH', 'Sin rompimiento reciente del máximo o mínimo previo.', 'ninguno reciente', 'tag-neutral'));
    }
  }

  if (sm.orderBlocks) {
    const ob = sm.orderBlocks;
    if (ob.lastBullish) {
      rows.push(row('Order Block alcista más reciente', 'Última vela bajista antes de un impulso fuerte al alza.', `$${fmtPrice(ob.lastBullish.low)}–$${fmtPrice(ob.lastBullish.high)}`, 'tag-good'));
    }
    if (ob.lastBearish) {
      rows.push(row('Order Block bajista más reciente', 'Última vela alcista antes de un impulso fuerte a la baja.', `$${fmtPrice(ob.lastBearish.low)}–$${fmtPrice(ob.lastBearish.high)}`, 'tag-bad'));
    }
    if (!ob.lastBullish && !ob.lastBearish) {
      rows.push(row('Order Blocks', 'Sin movimientos impulsivos claros detectados.', 'ninguno', 'tag-neutral'));
    }
  }

  if (sm.fairValueGaps && sm.fairValueGaps.length > 0) {
    sm.fairValueGaps.forEach((gap) => {
      rows.push(row(`Fair Value Gap (${gap.type})`, 'Hueco de precio real que el mercado no ha vuelto a llenar.', `$${fmtPrice(gap.bottom)}–$${fmtPrice(gap.top)}`, gap.type === 'alcista' ? 'tag-good' : 'tag-bad'));
    });
  } else {
    rows.push(row('Fair Value Gaps', 'Sin huecos sin llenar cerca del precio actual.', 'ninguno', 'tag-neutral'));
  }

  if (sm.liquidityGrabs && sm.liquidityGrabs.length > 0) {
    const g = sm.liquidityGrabs[sm.liquidityGrabs.length - 1];
    rows.push(row('Liquidity Grab más reciente', `Tocó $${fmtPrice(g.level)} y se devolvió — posible "caza" de órdenes.`, g.type, 'tag-neutral'));
  }

  if (sm.equalLevels) {
    if (sm.equalLevels.nearestEqualHigh) {
      rows.push(row('Equal Highs', 'Dos o más máximos casi al mismo nivel — liquidez agrupada arriba.', '$' + fmtPrice(sm.equalLevels.nearestEqualHigh), 'tag-bad'));
    }
    if (sm.equalLevels.nearestEqualLow) {
      rows.push(row('Equal Lows', 'Dos o más mínimos casi al mismo nivel — liquidez agrupada abajo.', '$' + fmtPrice(sm.equalLevels.nearestEqualLow), 'tag-good'));
    }
  }

  if (sm.premiumDiscount) {
    const pd = sm.premiumDiscount;
    const cls = pd.zone === 'premium' ? 'tag-bad' : (pd.zone === 'discount' ? 'tag-good' : 'tag-neutral');
    rows.push(row('Premium / Discount', 'Posición dentro del rango de los últimos ~90 días.', `${pd.zone} (${pd.positionPct.toFixed(0)}%)`, cls));
  }

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:10px;">Motor de Smart Money</div>
    ${rows.join('')}
    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Estos conceptos (ICT / Smart Money) no tienen una única definición universal en la comunidad — usamos las reglas más comunes, aplicadas matemáticamente sobre velas reales. No son señales de compra o venta.</div>
  `;
}
