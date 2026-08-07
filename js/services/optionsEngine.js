import { state } from '../state.js';
import { safeSetItem } from '../utils/storage.js';
import { renderOptionsCard } from '../ui/optionsCard.js';

// GEX real vía FlashAlpha, a través del Worker. Solo 5 consultas gratis al día
// EN TOTAL (no por acción), así que esto nunca se pide automáticamente —
// solo cuando el usuario toca el botón, a propósito.
export async function fetchGEX(symbol) {
  if (!state.aiProxyUrl || !state.aiProxyPassword) return;
  state.gexCache[symbol] = Object.assign({}, state.gexCache[symbol], { loading: true, error: null });
  renderOptionsCard();
  try {
    const res = await fetch(state.aiProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gexSymbol: symbol, password: state.aiProxyPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo obtener el GEX.');
    state.gexCache[symbol] = {
      loading: false, error: null, fetchedAt: Date.now(),
      netGex: data.net_gex, gammaFlip: data.gamma_flip, regime: data.regime,
    };
    safeSetItem('gex_cache', JSON.stringify(state.gexCache));
  } catch (e) {
    state.gexCache[symbol] = { loading: false, error: e.message || 'Error al consultar GEX.' };
  }
  renderOptionsCard();
}
