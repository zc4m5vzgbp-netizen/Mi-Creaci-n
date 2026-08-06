// Motor Técnico Avanzado — todos los cálculos son fórmulas estándar de análisis técnico,
// aplicadas sobre el mismo historial OHLC real que ya usamos. Cero costo adicional.

export function computeATR(highs, lows, closes, period = 14) {
  if (closes.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

export function computeADX(highs, lows, closes, period = 14) {
  if (closes.length < period * 2) return null;
  const plusDMs = [], minusDMs = [], trs = [];
  for (let i = 1; i < closes.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDMs.push((upMove > downMove && upMove > 0) ? upMove : 0);
    minusDMs.push((downMove > upMove && downMove > 0) ? downMove : 0);
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  function wilderSmooth(arr) {
    const smoothed = [];
    let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
    smoothed[period - 1] = sum;
    for (let i = period; i < arr.length; i++) {
      sum = sum - (sum / period) + arr[i];
      smoothed[i] = sum;
    }
    return smoothed;
  }
  const sPlusDM = wilderSmooth(plusDMs);
  const sMinusDM = wilderSmooth(minusDMs);
  const sTR = wilderSmooth(trs);

  const dxs = [];
  for (let i = period - 1; i < trs.length; i++) {
    if (!sTR[i]) continue;
    const plusDI = 100 * (sPlusDM[i] / sTR[i]);
    const minusDI = 100 * (sMinusDM[i] / sTR[i]);
    const denom = plusDI + minusDI;
    dxs.push({ dx: denom ? 100 * Math.abs(plusDI - minusDI) / denom : 0, plusDI, minusDI });
  }
  if (dxs.length < period) return null;
  const dxValues = dxs.map(d => d.dx);
  let adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }
  const last = dxs[dxs.length - 1];
  return { adx, plusDI: last.plusDI, minusDI: last.minusDI };
}

export function computeBollinger(closes, period = 20, mult = 2) {
  if (closes.length < period) return null;
  const tail = closes.slice(-period);
  const mean = tail.reduce((a, b) => a + b, 0) / period;
  const variance = tail.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return { middle: mean, upper: mean + mult * stdDev, lower: mean - mult * stdDev, bandwidthPct: (2 * mult * stdDev / mean) * 100 };
}

export function computeStochastic(highs, lows, closes, period = 14, smoothD = 3) {
  if (closes.length < period + smoothD) return null;
  const kValues = [];
  for (let i = period - 1; i < closes.length; i++) {
    const wh = highs.slice(i - period + 1, i + 1);
    const wl = lows.slice(i - period + 1, i + 1);
    const highestHigh = Math.max(...wh);
    const lowestLow = Math.min(...wl);
    kValues.push(highestHigh === lowestLow ? 50 : 100 * (closes[i] - lowestLow) / (highestHigh - lowestLow));
  }
  const lastK = kValues[kValues.length - 1];
  const dTail = kValues.slice(-smoothD);
  return { k: lastK, d: dTail.reduce((a, b) => a + b, 0) / dTail.length };
}

export function computeDonchian(highs, lows, period = 20) {
  if (highs.length < period) return null;
  const wh = highs.slice(-period);
  const wl = lows.slice(-period);
  const upper = Math.max(...wh);
  const lower = Math.min(...wl);
  return { upper, lower, middle: (upper + lower) / 2 };
}

function periodMidpoint(highs, lows, period) {
  if (highs.length < period) return null;
  const wh = highs.slice(-period);
  const wl = lows.slice(-period);
  return (Math.max(...wh) + Math.min(...wl)) / 2;
}

export function computeIchimoku(highs, lows, closes) {
  const tenkan = periodMidpoint(highs, lows, 9);
  const kijun = periodMidpoint(highs, lows, 26);
  const spanB = periodMidpoint(highs, lows, 52);
  if (tenkan == null || kijun == null || spanB == null) return null;
  const spanA = (tenkan + kijun) / 2;
  const price = closes[closes.length - 1];
  const cloudTop = Math.max(spanA, spanB);
  const cloudBottom = Math.min(spanA, spanB);
  let position = 'dentro';
  if (price > cloudTop) position = 'arriba';
  else if (price < cloudBottom) position = 'abajo';
  return { tenkan, kijun, spanA, spanB, position, cloudBullish: spanA > spanB };
}

export function computeSuperTrend(highs, lows, closes, period = 10, multiplier = 3) {
  if (closes.length < period + 2) return null;
  const trs = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  const atrSeries = [];
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atrSeries[period - 1] = atr;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    atrSeries[i] = atr;
  }
  let finalUpper = null, finalLower = null, trendUp = true;
  for (let i = period; i < trs.length; i++) {
    const idx = i + 1;
    const atrVal = atrSeries[i];
    const basicUpper = (highs[idx] + lows[idx]) / 2 + multiplier * atrVal;
    const basicLower = (highs[idx] + lows[idx]) / 2 - multiplier * atrVal;
    if (finalUpper === null) {
      finalUpper = basicUpper;
      finalLower = basicLower;
    } else {
      finalUpper = (basicUpper < finalUpper || closes[idx - 1] > finalUpper) ? basicUpper : finalUpper;
      finalLower = (basicLower > finalLower || closes[idx - 1] < finalLower) ? basicLower : finalLower;
    }
    if (closes[idx] > finalUpper) trendUp = true;
    else if (closes[idx] < finalLower) trendUp = false;
  }
  return { direction: trendUp ? 'alcista' : 'bajista', stopLevel: trendUp ? finalLower : finalUpper };
}
