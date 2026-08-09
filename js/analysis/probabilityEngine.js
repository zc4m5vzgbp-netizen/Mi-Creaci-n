import { computeWilsonInterval } from './statistics.js';

// Motor de Probabilidades — combina señales de RSI, tendencia y momentum
// (del Motor Técnico) para clasificar el "estado" actual de la acción, y
// busca en el historial real cuántas veces estuvo en un estado parecido,
// y qué pasó después. Son frecuencias históricas reales, no una predicción.

function computeRSISeriesInternal(closes, period) {
  const series = [];
  if (closes.length < period + 1) return series;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  series[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    series[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return series;
}

function computeSMASeriesInternal(closes, period) {
  const series = [];
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    series[i] = sum / period;
  }
  return series;
}

function classifyState(closes, rsiSeries, sma50Series, i) {
  if (i < 5) return null;
  const rsi = rsiSeries[i];
  const sma50 = sma50Series[i];
  if (rsi == null || sma50 == null) return null;
  const rsiZone = rsi < 35 ? 'sobrevendido' : (rsi > 65 ? 'sobrecomprado' : 'neutral');
  const trend = closes[i] > sma50 ? 'alcista' : 'bajista';
  const momentum = closes[i] > closes[i - 5] ? 'positivo' : 'negativo';
  return { key: `${rsiZone}_${trend}_${momentum}`, rsiZone, trend, momentum };
}

// Devuelve: % de veces que, en una configuración histórica parecida a la de hoy
// (mismo RSI/tendencia/momentum), el precio terminó arriba, abajo, o sin cambio
// significativo, 5 días de cotización después. Es un conteo real, no una IA.
export function computeDirectionalProbability(closes, lookAheadDays = 5, thresholdPct = 2) {
  const rsiSeries = computeRSISeriesInternal(closes, 14);
  const sma50Series = computeSMASeriesInternal(closes, 50);
  const todayIdx = closes.length - 1;
  const today = classifyState(closes, rsiSeries, sma50Series, todayIdx);
  if (!today) return null;

  const maxIdx = closes.length - lookAheadDays - 1;
  let up = 0, down = 0, flat = 0, total = 0;
  let i = 50;
  while (i <= maxIdx) {
    const state = classifyState(closes, rsiSeries, sma50Series, i);
    if (!state || state.key !== today.key) {
      i++;
      continue;
    }
    const changePct = ((closes[i + lookAheadDays] - closes[i]) / closes[i]) * 100;
    total++;
    if (changePct > thresholdPct) up++;
    else if (changePct < -thresholdPct) down++;
    else flat++;
    // Salto de ventana no-solapada: la próxima observación empieza después de
    // que termine la ventana de resultado de esta, igual que computeZoneProbability.
    i += lookAheadDays;
  }

  if (total === 0) return null;
  return {
    upPct: (up / total) * 100,
    downPct: (down / total) * 100,
    flatPct: (flat / total) * 100,
    sample: total,
    state: today,
    lookAheadDays,
    thresholdPct,
    wilsonUp: computeWilsonInterval(up, total),
    wilsonDown: computeWilsonInterval(down, total),
    wilsonFlat: computeWilsonInterval(flat, total),
  };
}
