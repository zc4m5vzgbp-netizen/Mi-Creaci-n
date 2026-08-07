// Motor de Volumen — indicadores estándar (Acumulación/Distribución) más
// aproximaciones honestas donde el dato real requeriría información
// intradía que no existe gratis (delta, volume profile). Cada función lo indica.

export function computeAbnormalVolume(volumes, period = 20) {
  if (volumes.length < period + 1) return null;
  const baseline = volumes.slice(-(period + 1), -1);
  const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const variance = baseline.reduce((a, b) => a + (b - mean) ** 2, 0) / baseline.length;
  const stdDev = Math.sqrt(variance);
  const today = volumes[volumes.length - 1];
  const zScore = stdDev === 0 ? 0 : (today - mean) / stdDev;
  let level = 'normal';
  if (zScore >= 3) level = 'extremo';
  else if (zScore >= 2) level = 'alto';
  else if (zScore <= -1.5) level = 'muy bajo';
  return { zScore, level, todayVolume: today, avgVolume: mean };
}

// Acumulación/Distribución — fórmula estándar (Marc Chaikin), real, no una aproximación.
export function computeAccumDistLine(ohlc, volumes, period = 20) {
  if (ohlc.length < period + 1) return null;
  const adValues = [];
  let cumulative = 0;
  for (let i = 0; i < ohlc.length; i++) {
    const c = ohlc[i];
    const range = c.high - c.low;
    const mfm = range === 0 ? 0 : ((c.close - c.low) - (c.high - c.close)) / range;
    cumulative += mfm * volumes[i];
    adValues.push(cumulative);
  }
  const n = Math.min(period, adValues.length);
  const recent = adValues.slice(-n);
  return { current: adValues[adValues.length - 1], trend: recent[recent.length - 1] > recent[0] ? 'acumulación' : 'distribución' };
}

// Estimación de "delta" a partir de dónde cerró la vela dentro de su rango del día —
// NO es el delta real de compras vs. ventas (eso requiere datos de cada operación).
export function computeApproxDelta(ohlc, volumes) {
  const c = ohlc[ohlc.length - 1];
  const range = c.high - c.low;
  if (range === 0) return null;
  const mfm = ((c.close - c.low) - (c.high - c.close)) / range;
  const estimatedDelta = mfm * volumes[volumes.length - 1];
  const bias = mfm > 0.2 ? 'comprador' : (mfm < -0.2 ? 'vendedor' : 'neutral');
  return { mfm, estimatedDelta, bias };
}

export function detectVolumeClimax(closes, abnormal, period = 10) {
  if (!abnormal || abnormal.zScore < 2) return null;
  if (closes.length < period + 1) return null;
  const recentChange = closes[closes.length - 1] - closes[closes.length - 1 - period];
  if (recentChange > 0) {
    return { type: 'clímax de compra', desc: 'Volumen extremo tras una subida reciente — posible agotamiento alcista.' };
  }
  return { type: 'clímax de venta', desc: 'Volumen extremo tras una caída reciente — posible agotamiento bajista.' };
}

function computeAvgRange(highs, lows, period) {
  const n = Math.min(period, highs.length);
  let sum = 0;
  for (let i = highs.length - n; i < highs.length; i++) sum += highs[i] - lows[i];
  return sum / n;
}

export function detectAbsorption(ohlc, highs, lows, todayVolume, avgVolume, period = 20) {
  if (!avgVolume) return { detected: false };
  const c = ohlc[ohlc.length - 1];
  const range = c.high - c.low;
  const avgRange = computeAvgRange(highs, lows, period);
  const volumeRatio = todayVolume / avgVolume;
  const rangeRatio = avgRange ? range / avgRange : 1;
  if (volumeRatio >= 1.5 && rangeRatio <= 0.7) {
    return { detected: true, volumeRatio, rangeRatio, desc: `Volumen ${volumeRatio.toFixed(1)}x lo normal, pero el rango del día fue solo ${(rangeRatio * 100).toFixed(0)}% de lo habitual — posible absorción.` };
  }
  return { detected: false };
}

// Perfil de volumen aproximado por varios DÍAS (no dentro de un solo día, que
// requeriría datos intradía). Usa el cierre de cada día como ubicación de precio.
export function computeApproxVolumeProfile(ohlc, volumes, lookbackDays = 90, buckets = 10) {
  const n = Math.min(lookbackDays, ohlc.length);
  const recentOhlc = ohlc.slice(-n);
  const recentVolumes = volumes.slice(-n);
  const closes = recentOhlc.map((c) => c.close);
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  if (high === low) return null;
  const bucketSize = (high - low) / buckets;
  const bucketVolumes = new Array(buckets).fill(0);
  for (let i = 0; i < closes.length; i++) {
    let idx = Math.floor((closes[i] - low) / bucketSize);
    if (idx >= buckets) idx = buckets - 1;
    if (idx < 0) idx = 0;
    bucketVolumes[idx] += recentVolumes[i];
  }
  let maxIdx = 0;
  for (let i = 1; i < buckets; i++) { if (bucketVolumes[i] > bucketVolumes[maxIdx]) maxIdx = i; }
  const pocPrice = low + bucketSize * (maxIdx + 0.5);
  return { pocPrice, low, high };
}
