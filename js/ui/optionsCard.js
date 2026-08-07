import { state } from '../state.js';
import { fmtPrice } from '../utils/format.js';

export function renderOptionsCard() {
  const card = document.getElementById('optionsCard');
  if (!card) return;
  if (!state.aiProxyUrl || !state.aiProxyPassword) {
    card.innerHTML = `<div class="card-title">Motor de Opciones</div><div class="dim" style="font-size:13px; margin-top:10px;">Necesita tu intermediario de IA conectado en ⚙ (el mismo que usas para el análisis con IA y los datos macro).</div>`;
    return;
  }
  const g = state.gexCache[state.selected];
  let body;
  if (!g) {
    body = `<button class="btn-primary" style="margin-top:12px;" onclick="fetchGEX('${state.selected}')">Consultar GEX de ${state.selected}</button><div class="dim" style="font-size:11px; margin-top:8px;">Usa 1 de tus 5 consultas gratis del día — en total, no por acción. Se guarda hasta que la pidas de nuevo.</div>`;
  } else if (g.loading) {
    body = `<div class="dim loading-pulse" style="font-size:13px; margin-top:10px;">Consultando GEX…</div>`;
  } else if (g.error) {
    body = `<div style="color:var(--loss); font-size:13px; margin:10px 0 8px;">${g.error}</div><button class="btn-ghost" style="background:var(--surface-alt); border:1px solid var(--hairline); border-radius:6px; padding:6px 12px;" onclick="fetchGEX('${state.selected}')">Reintentar (usa 1 consulta)</button>`;
  } else {
    const gexClass = g.netGex > 0 ? 'tag-good' : 'tag-bad';
    const regimeLabel = g.netGex > 0
      ? 'gamma positiva — los creadores de mercado tienden a frenar el movimiento del precio'
      : 'gamma negativa — los creadores de mercado tienden a amplificar el movimiento del precio';
    const ago = Math.max(0, Math.round((Date.now() - g.fetchedAt) / 60000));
    body = `
      <div class="indicator-row"><div><div class="indicator-label">Exposición Gamma (GEX) neta</div><div class="indicator-caption">${regimeLabel}</div></div><div style="text-align:right;"><div class="mono ${gexClass}">${g.netGex != null ? g.netGex.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}</div></div></div>
      ${g.gammaFlip != null ? `<div class="indicator-row"><div><div class="indicator-label">Punto de giro de gamma</div><div class="indicator-caption">Nivel de precio donde el comportamiento de los creadores de mercado cambia de dirección.</div></div><div style="text-align:right;"><div class="mono">$${fmtPrice(g.gammaFlip)}</div></div></div>` : ''}
      <div class="dim" style="font-size:10.5px; margin-top:8px;">Consultado hace ${ago < 1 ? 'menos de 1' : ago} min.</div>
      <button class="btn-ghost" style="margin-top:6px;" onclick="fetchGEX('${state.selected}')">Actualizar (usa 1 de tus 5 consultas del día)</button>
    `;
  }
  card.innerHTML = `
    <div class="card-title" style="margin-bottom:4px;">Motor de Opciones</div>
    <div class="dim" style="font-size:11px; margin-bottom:10px; line-height:1.4;">GEX real de FlashAlpha. Max Pain no está disponible gratis en ningún proveedor que encontramos — solo con planes de pago.</div>
    ${body}
  `;
}
