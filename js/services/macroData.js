import { state } from '../state.js';
import { safeSetItem } from '../utils/storage.js';
import { renderFundamentalCard } from '../ui/fundamentalCard.js';

// Series de FRED: CPI (inflación consumidor), PPI (inflación productor),
// PIB (economía), Tasa de la Reserva Federal. Son las mismas para toda la app,
// no cambian según la acción que estés viendo.
const FRED_SERIES = {
  cpi: 'CPIAUCSL',
  ppi: 'PPIACO',
  gdp: 'GDP',
  fedRate: 'FEDFUNDS',
};

export async function maybeFetchMacroData() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.macroCache && state.macroCache.fetchedDate === today && !state.macroCache.error) {
    renderFundamentalCard();
    return;
  }
  if (!state.aiProxyUrl || !state.aiProxyPassword) {
    renderFundamentalCard();
    return;
  }
  state.macroCache = { loading: true };
  renderFundamentalCard();
  try {
    const results = {};
    for (const key of Object.keys(FRED_SERIES)) {
      const res = await fetch(state.aiProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesId: FRED_SERIES[key], password: state.aiProxyPassword, limit: 13 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error obteniendo ${key} de FRED`);
      results[key] = data.observations || [];
    }
    state.macroCache = { loading: false, error: null, fetchedDate: today, data: results };
    safeSetItem('macro_cache', JSON.stringify(state.macroCache));
  } catch (e) {
    state.macroCache = { loading: false, error: e.message || 'Error al obtener datos macro.' };
  }
  renderFundamentalCard();
}
