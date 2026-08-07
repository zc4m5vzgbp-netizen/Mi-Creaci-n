import { state } from '../state.js';
import { fmtPrice } from '../utils/format.js';

function row(label, caption, valueHtml, signalClass) {
  return `<div class="indicator-row"><div><div class="indicator-label">${label}</div><div class="indicator-caption">${caption}</div></div><div style="text-align:right;"><div class="mono ${signalClass}" style="font-size:13px;">${valueHtml}</div></div></div>`;
}

export function renderVolumeEngine() {
  const card = document.getElementById('volumeEngineCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Motor de Volumen</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores — toca "Analizar" arriba.</div>`;
    return;
  }
  if (data.error || !data.volumeEngine) { card.innerHTML = ''; return; }

  const v = data.volumeEngine;
  const rows = [];

  if (v.abnormal) {
    const cls = v.abnormal.level === 'extremo' ? 'tag-bad' : (v.abnormal.level === 'alto' ? 'tag-neutral' : 'tag-neutral');
    rows.push(row('Volumen anormal', 'Comparado estadísticamente contra los últimos 20 días.', `${v.abnormal.level} (z=${v.abnormal.zScore.toFixed(1)})`, cls));
  }

  if (v.accumDist) {
    const cls = v.accumDist.trend === 'acumulación' ? 'tag-good' : 'tag-bad';
    rows.push(row('Acumulación / Distribución', 'Indicador real, no aproximado — combina precio y volumen.', v.accumDist.trend, cls));
  }

  if (v.approxDelta) {
    const cls = v.approxDelta.bias === 'comprador' ? 'tag-good' : (v.approxDelta.bias === 'vendedor' ? 'tag-bad' : 'tag-neutral');
    rows.push(row('Delta (estimado)*', '*No es el delta real de compras vs. ventas — estimado por dónde cerró la vela en su rango.', v.approxDelta.bias, cls));
  }

  if (v.climax) {
    rows.push(row(v.climax.type === 'clímax de compra' ? 'Clímax de compra' : 'Clímax de venta', v.climax.desc, 'detectado', 'tag-neutral'));
  }

  if (v.absorption && v.absorption.detected) {
    rows.push(row('Absorción', v.absorption.desc, 'detectada', 'tag-neutral'));
  }

  if (v.volumeProfile) {
    rows.push(row('Zona de mayor volumen (aprox.)*', '*No es volume profile intradía real — es dónde se concentró el volumen en ~90 días.', '$' + fmtPrice(v.volumeProfile.pocPrice), 'tag-neutral'));
  }

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:10px;">Motor de Volumen</div>
    ${rows.length ? rows.join('') : '<div class="dim" style="font-size:13px;">Sin señales relevantes de volumen hoy.</div>'}
    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Los ítems marcados con * son aproximaciones a partir de datos diarios — la versión real requiere datos de cada operación individual, que no existen gratis. El resto son fórmulas estándar reales.</div>
  `;
}
