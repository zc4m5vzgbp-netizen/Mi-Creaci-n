// Motor Matemático — funciones puras, reutilizables por cualquier otro motor.
// Todo calculado sobre el historial real que ya tenemos, cero costo adicional.

export function computeStdDev(values) {
  if (!values || values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// Regresión lineal simple (mínimos cuadrados) sobre los últimos N cierres.
// Devuelve pendiente, proyección para el próximo día, y qué tan bien ajusta (R²).
export function computeLinearRegression(closes, period = 20) {
  const n = Math.min(period, closes.length);
  if (n < 3) return null;
  const tail = closes.slice(-n);
  const xs = tail.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = tail.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (tail[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (tail[i] - predicted) ** 2;
    ssTot += (tail[i] - yMean) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const nextValue = slope * n + intercept;
  return {
    slope,
    rSquared,
    nextValue,
    direction: slope > 0 ? 'alcista' : (slope < 0 ? 'bajista' : 'plana'),
    slopePct: (slope / yMean) * 100,
  };
}

// Volatilidad histórica anualizada, a partir de retornos logarítmicos diarios reales.
export function computeHistoricalVolatility(closes, period = 20) {
  if (closes.length < period + 1) return null;
  const tail = closes.slice(-(period + 1));
  const logReturns = [];
  for (let i = 1; i < tail.length; i++) {
    logReturns.push(Math.log(tail[i] / tail[i - 1]));
  }
  const stdDev = computeStdDev(logReturns);
  if (stdDev == null) return null;
  const annualized = stdDev * Math.sqrt(252) * 100;
  return { dailyPct: stdDev * 100, annualizedPct: annualized };
}

// Media móvil ponderada linealmente — los días recientes pesan más.
export function computeWeightedMovingAverage(closes, period = 20) {
  if (closes.length < period) return null;
  const tail = closes.slice(-period);
  let weightedSum = 0, weightTotal = 0;
  for (let i = 0; i < period; i++) {
    const weight = i + 1;
    weightedSum += tail[i] * weight;
    weightTotal += weight;
  }
  return weightedSum / weightTotal;
}

// En qué percentil de su propio rango histórico está el precio actual.
export function computePricePercentile(closes, currentPrice) {
  if (!closes || closes.length < 10) return null;
  const sorted = closes.slice().sort((a, b) => a - b);
  let countBelow = 0;
  for (const c of sorted) { if (c <= currentPrice) countBelow++; }
  return (countBelow / sorted.length) * 100;
}

// Zonas objetivo proyectadas usando múltiplos de ATR, no niveles inventados.
export function computeTargetZones(price, atr) {
  if (!atr || atr <= 0) return null;
  return {
    upside: { t1: price + atr * 1, t2: price + atr * 2, t3: price + atr * 3 },
    downside: { t1: price - atr * 1, t2: price - atr * 2, t3: price - atr * 3 },
  };
}

// Interpretación propia (no un término financiero estándar): qué tan sensible es
// el cambio de precio ante cambios de volumen, día a día, sobre el historial real.
export function computePriceVolumeElasticity(closes, volumes, period = 30) {
  const n = Math.min(period, closes.length - 1, volumes.length - 1);
  if (n < 5) return null;
  const priceChanges = [], volumeChanges = [];
  const startIdx = closes.length - n;
  for (let i = startIdx; i < closes.length; i++) {
    if (closes[i - 1] === 0 || volumes[i - 1] === 0) continue;
    priceChanges.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    volumeChanges.push((volumes[i] - volumes[i - 1]) / volumes[i - 1]);
  }
  if (priceChanges.length < 5) return null;
  const pMean = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
  const vMean = volumeChanges.reduce((a, b) => a + b, 0) / volumeChanges.length;
  let num = 0, den = 0;
  for (let i = 0; i < priceChanges.length; i++) {
    num += (volumeChanges[i] - vMean) * (priceChanges[i] - pMean);
    den += (volumeChanges[i] - vMean) ** 2;
  }
  if (den === 0) return null;
  const coefficient = num / den;
  return { coefficient, sample: priceChanges.length };
}
