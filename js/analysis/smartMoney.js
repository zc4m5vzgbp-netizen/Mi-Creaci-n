// Motor de Smart Money — patrones de "Smart Money Concepts" (ICT), detectados
// con reglas matemáticas estándar de la comunidad sobre velas reales.
// Nota: a diferencia de RSI o MACD, estos conceptos no tienen una única
// definición universal — usamos las definiciones más comunes y las explicamos.

function detectSwingPoints(highs, lows, window = 3) {
  const swings = [];
  for (let i = window; i < highs.length - window; i++) {
    let isHigh = true, isLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (highs[j] >= highs[i]) isHigh = false;
      if (lows[j] <= lows[i]) isLow = false;
    }
    if (isHigh) swings.push({ index: i, type: 'high', price: highs[i] });
    if (isLow) swings.push({ index: i, type: 'low', price: lows[i] });
  }
  return swings;
}

// La última vela "equivocada" antes de un movimiento fuerte en la otra dirección.
export function detectOrderBlocks(ohlc, lookForward = 3, impulseMultiplier = 1.5) {
  if (ohlc.length < lookForward + 5) return { lastBullish: null, lastBearish: null };
  const ranges = ohlc.map((c) => c.high - c.low);
  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  let lastBullish = null, lastBearish = null;

  for (let i = 0; i < ohlc.length - lookForward; i++) {
    const candle = ohlc[i];
    const moveEnd = ohlc[Math.min(i + lookForward, ohlc.length - 1)];
    if (candle.close < candle.open) {
      const impulse = moveEnd.close - candle.close;
      if (impulse > avgRange * impulseMultiplier) {
        lastBullish = { index: i, high: candle.high, low: candle.low, time: candle.time };
      }
    }
    if (candle.close > candle.open) {
      const impulse = candle.close - moveEnd.close;
      if (impulse > avgRange * impulseMultiplier) {
        lastBearish = { index: i, high: candle.high, low: candle.low, time: candle.time };
      }
    }
  }
  return { lastBullish, lastBearish };
}

// Huecos de precio entre la vela 1 y la vela 3 que el mercado no volvió a llenar.
export function detectFairValueGaps(ohlc, currentPrice) {
  const gaps = [];
  for (let i = 2; i < ohlc.length; i++) {
    const a = ohlc[i - 2], c = ohlc[i];
    if (a.high < c.low) {
      gaps.push({ type: 'alcista', top: c.low, bottom: a.high, time: ohlc[i - 1].time, index: i - 1 });
    } else if (a.low > c.high) {
      gaps.push({ type: 'bajista', top: a.low, bottom: c.high, time: ohlc[i - 1].time, index: i - 1 });
    }
  }
  // Solo nos interesan los que el precio actual no ha "rellenado" todavía.
  const unfilled = gaps.filter((g) => currentPrice < g.bottom || currentPrice > g.top);
  return unfilled.slice(-3);
}

// Estructura de mercado: BOS (rompe a favor de la tendencia) o CHoCH (rompe en contra, posible giro).
export function detectStructureBreak(highs, lows, closes) {
  const swings = detectSwingPoints(highs, lows, 3);
  const swingHighs = swings.filter((s) => s.type === 'high');
  const swingLows = swings.filter((s) => s.type === 'low');
  if (swingHighs.length < 2 || swingLows.length < 2) return null;

  const lastHigh = swingHighs[swingHighs.length - 1];
  const prevHigh = swingHighs[swingHighs.length - 2];
  const lastLow = swingLows[swingLows.length - 1];
  const prevLow = swingLows[swingLows.length - 2];
  const price = closes[closes.length - 1];

  const structureUp = lastHigh.price > prevHigh.price && lastLow.price > prevLow.price;
  const structureDown = lastHigh.price < prevHigh.price && lastLow.price < prevLow.price;
  const structure = structureUp ? 'alcista' : (structureDown ? 'bajista' : 'indefinida');

  let event = null;
  if (structureUp && price < lastLow.price) {
    event = { type: 'CHoCH', direction: 'posible giro bajista', desc: `El precio rompió el último mínimo ascendente ($${lastLow.price.toFixed(2)})` };
  } else if (structureUp && price > lastHigh.price) {
    event = { type: 'BOS', direction: 'continúa alcista', desc: `El precio rompió el último máximo ($${lastHigh.price.toFixed(2)})` };
  } else if (structureDown && price > lastHigh.price) {
    event = { type: 'CHoCH', direction: 'posible giro alcista', desc: `El precio rompió el último máximo descendente ($${lastHigh.price.toFixed(2)})` };
  } else if (structureDown && price < lastLow.price) {
    event = { type: 'BOS', direction: 'continúa bajista', desc: `El precio rompió el último mínimo ($${lastLow.price.toFixed(2)})` };
  }

  return { structure, event, lastHigh, lastLow };
}

// Precio que tocó brevemente un máximo/mínimo previo y se devolvió — "cazando" las órdenes ahí.
export function detectLiquidityGrabs(ohlc, highs, lows, lookback = 100) {
  const swings = detectSwingPoints(highs, lows, 3);
  const grabs = [];
  const start = Math.max(0, ohlc.length - lookback);

  for (let i = start; i < ohlc.length; i++) {
    const candle = ohlc[i];
    for (const s of swings) {
      if (s.index >= i) continue;
      if (s.type === 'high' && candle.high > s.price && candle.close < s.price) {
        grabs.push({ type: 'falso rompimiento alcista', level: s.price, time: candle.time, index: i });
      }
      if (s.type === 'low' && candle.low < s.price && candle.close > s.price) {
        grabs.push({ type: 'falso rompimiento bajista', level: s.price, time: candle.time, index: i });
      }
    }
  }
  return grabs.slice(-3);
}

// Dos o más máximos (o mínimos) casi al mismo nivel — zonas de liquidez agrupada.
export function detectEqualLevels(highs, lows, tolerancePct = 0.15) {
  const swings = detectSwingPoints(highs, lows, 3);
  const swingHighs = swings.filter((s) => s.type === 'high').map((s) => s.price);
  const swingLows = swings.filter((s) => s.type === 'low').map((s) => s.price);

  function findPairs(prices) {
    const found = [];
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        if (Math.abs(prices[i] - prices[j]) / prices[i] * 100 <= tolerancePct) {
          found.push((prices[i] + prices[j]) / 2);
        }
      }
    }
    return found;
  }

  const equalHighs = findPairs(swingHighs);
  const equalLows = findPairs(swingLows);
  return {
    nearestEqualHigh: equalHighs.length ? equalHighs[equalHighs.length - 1] : null,
    nearestEqualLow: equalLows.length ? equalLows[equalLows.length - 1] : null,
  };
}

// Si el precio está en la mitad "cara" (premium) o "barata" (discount) de su rango reciente.
export function computePremiumDiscount(price, rangeHigh, rangeLow) {
  if (!rangeHigh || !rangeLow || rangeHigh === rangeLow) return null;
  const positionPct = ((price - rangeLow) / (rangeHigh - rangeLow)) * 100;
  let zone = 'equilibrio';
  if (positionPct >= 55) zone = 'premium';
  else if (positionPct <= 45) zone = 'discount';
  return { positionPct, zone };
}
