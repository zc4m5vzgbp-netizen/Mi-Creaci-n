import { AV_BASE, HISTORY_DAYS, CHART_DISPLAY_DAYS } from '../constants.js';
import { state } from '../state.js';
import { fetchWithRetry } from '../utils/dom.js';
import { safeSetItem } from '../utils/storage.js';
import { computeSMA, computeMACD, computeRSI } from '../analysis/indicators.js';
import { computePriceAction, detectEngulfingMarkers } from '../analysis/priceAction.js';
import { renderIndicators } from '../ui/indicatorsCard.js';
import { renderWatchlist } from '../ui/watchlist.js';

export async function fetchIndicators(symbol, force) {
  const today = new Date().toISOString().slice(0, 10);
  const cached = state.indicatorsCache[symbol];
  if (!force && cached && cached.fetchedDate === today && !cached.error) { renderIndicators(); renderWatchlist(); return; }
  state.indicatorsCache[symbol] = { loading: true };
  renderIndicators();
  try {
    const res = await fetchWithRetry(`${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${state.avKey}`);
    const data = await res.json();
    if (data['Note'] || data['Information']) throw new Error('Se acabaron tus 25 consultas gratis de hoy en Alpha Vantage. Intenta mañana.');
    const series = data['Time Series (Daily)'];
    if (!series) throw new Error('No se pudo obtener el historial de este símbolo.');
    const allDates = Object.keys(series).sort();
    const dates = allDates.slice(-HISTORY_DAYS);
    const opens = dates.map((d) => parseFloat(series[d]['1. open']));
    const highs = dates.map((d) => parseFloat(series[d]['2. high']));
    const lows = dates.map((d) => parseFloat(series[d]['3. low']));
    const closes = dates.map((d) => parseFloat(series[d]['4. close']));
    const volumes = dates.map((d) => parseFloat(series[d]['5. volume']));
    const ohlc = dates.map((d, i) => ({ time: d, open: opens[i], high: highs[i], low: lows[i], close: closes[i] }));
    const macd = computeMACD(closes);
    const macdYesterday = computeMACD(closes.slice(0, -1));
    const freshCross = !!(macdYesterday && macd && macdYesterday.signal != null && macd.signal != null && macdYesterday.line <= macdYesterday.signal && macd.line > macd.signal);
    const recentUpDay = closes.length >= 2 ? closes[closes.length - 1] > closes[closes.length - 2] : false;
    const recentOhlcForEngulfing = ohlc.slice(-CHART_DISPLAY_DAYS);
    const engulfingMarkers = detectEngulfingMarkers(recentOhlcForEngulfing);
    const lastEngulfing = engulfingMarkers[engulfingMarkers.length - 1];
    state.indicatorsCache[symbol] = {
      loading: false, error: null, fetchedDate: today,
      lastClose: closes[closes.length - 1],
      sma20: computeSMA(closes, 20),
      sma50: computeSMA(closes, 50),
      rsi14: computeRSI(closes, 14),
      macd: macd,
      freshCross: freshCross,
      recentUpDay: recentUpDay,
      recentCloses: closes.slice(-11),
      historyDays: closes.length,
      priceAction: computePriceAction(closes, highs, lows, closes[closes.length - 1]),
      todayVolume: volumes[volumes.length - 1],
      avgVolume20: computeSMA(volumes, 20),
      ohlc: ohlc,
      recentEngulfingCount: engulfingMarkers.length,
      lastEngulfingType: lastEngulfing ? (lastEngulfing.text) : null,
    };
    safeSetItem('indicators_cache', JSON.stringify(state.indicatorsCache));
  } catch (e) {
    state.indicatorsCache[symbol] = { loading: false, error: e.message || 'Error al obtener indicadores.' };
  }
  renderIndicators();
  renderWatchlist();
}
