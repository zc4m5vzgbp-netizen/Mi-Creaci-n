export function computeSMA(values, period) {
  if (values.length < period) return null;
  const tail = values.slice(-period);
  return tail.reduce((a, b) => a + b, 0) / period;
}

export function computeEMASeries(closes, period) {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const emaArr = [];
  let sma = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emaArr[period - 1] = sma;
  for (let i = period; i < closes.length; i++) {
    emaArr[i] = closes[i] * k + emaArr[i - 1] * (1 - k);
  }
  return emaArr;
}

export function computeRSI(closes, period) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeMACD(closes) {
  const ema12 = computeEMASeries(closes, 12);
  const ema26 = computeEMASeries(closes, 26);
  if (!ema26.length) return null;
  const macdValues = [];
  for (let i = 25; i < closes.length; i++) {
    if (ema12[i] !== undefined && ema26[i] !== undefined) macdValues.push(ema12[i] - ema26[i]);
  }
  const signalSeries = computeEMASeries(macdValues, 9);
  const lastMacd = macdValues[macdValues.length - 1];
  const lastSignal = signalSeries[signalSeries.length - 1];
  if (lastMacd === undefined) return null;
  if (lastSignal === undefined) return { line: lastMacd, signal: null, hist: null };
  return { line: lastMacd, signal: lastSignal, hist: lastMacd - lastSignal };
}

