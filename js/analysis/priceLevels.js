// Niveles de precio — Puntos Pivote (fórmula clásica) y Fibonacci sobre el rango real
// de máximos/mínimos del historial. Matemática estándar, sin costo adicional.

export function computePivotPoints(prevHigh, prevLow, prevClose) {
  const pivot = (prevHigh + prevLow + prevClose) / 3;
  return {
    pivot,
    r1: 2 * pivot - prevLow,
    s1: 2 * pivot - prevHigh,
    r2: pivot + (prevHigh - prevLow),
    s2: pivot - (prevHigh - prevLow),
    r3: prevHigh + 2 * (pivot - prevLow),
    s3: prevLow - 2 * (prevHigh - pivot),
  };
}

export function computeFibonacci(highs, lows, lookback = 90) {
  const window = Math.min(lookback, highs.length);
  if (window < 5) return null;
  const wh = highs.slice(-window);
  const wl = lows.slice(-window);
  const highVal = Math.max(...wh);
  const lowVal = Math.min(...wl);
  const highIdx = wh.lastIndexOf(highVal);
  const lowIdx = wl.lastIndexOf(lowVal);
  const uptrend = highIdx > lowIdx;
  const range = highVal - lowVal;
  if (range === 0) return null;

  const levels = uptrend
    ? { '23.6': highVal - range * 0.236, '38.2': highVal - range * 0.382, '50.0': highVal - range * 0.5, '61.8': highVal - range * 0.618, '78.6': highVal - range * 0.786 }
    : { '23.6': lowVal + range * 0.236, '38.2': lowVal + range * 0.382, '50.0': lowVal + range * 0.5, '61.8': lowVal + range * 0.618, '78.6': lowVal + range * 0.786 };

  const extensions = uptrend
    ? { '127.2': highVal + range * 0.272, '161.8': highVal + range * 0.618, '200.0': highVal + range * 1.0 }
    : { '127.2': lowVal - range * 0.272, '161.8': lowVal - range * 0.618, '200.0': lowVal - range * 1.0 };

  return { uptrend, high: highVal, low: lowVal, levels, extensions };
}
