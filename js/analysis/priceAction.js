export function computeZoneProbability(closes, zonePrice, zoneType) {
  const thresholdPct = 0.02;
  const lookAheadDays = 5;
  let approaches = 0, bounces = 0;
  let i = 0;
  while (i < closes.length - lookAheadDays) {
    const price = closes[i];
    const distPct = Math.abs(price - zonePrice) / zonePrice;
    if (distPct <= thresholdPct) {
      approaches++;
      const future = closes.slice(i + 1, i + 1 + lookAheadDays);
      let brokeThrough;
      if (zoneType === 'support') {
        const minFuture = Math.min.apply(null, future);
        brokeThrough = minFuture < zonePrice * (1 - thresholdPct * 1.5);
      } else {
        const maxFuture = Math.max.apply(null, future);
        brokeThrough = maxFuture > zonePrice * (1 + thresholdPct * 1.5);
      }
      if (!brokeThrough) bounces++;
      i += lookAheadDays;
    } else {
      i++;
    }
  }
  if (approaches === 0) return null;
  return { approaches, bounces, bounceRate: bounces / approaches };
}

export function computePriceAction(closes, highs, lows, currentPrice) {
  const window = 3;
  const points = [];
  for (let i = window; i < highs.length - window; i++) {
    let isSwingHigh = true, isSwingLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (highs[j] >= highs[i]) isSwingHigh = false;
      if (lows[j] <= lows[i]) isSwingLow = false;
    }
    if (isSwingHigh) points.push(highs[i]);
    if (isSwingLow) points.push(lows[i]);
  }
  if (points.length === 0) return null;
  const sorted = points.slice().sort((a, b) => a - b);
  const clusters = [];
  sorted.forEach((p) => {
    let merged = false;
    for (const c of clusters) {
      if (Math.abs(p - c.avg) / c.avg <= 0.015) {
        c.points.push(p);
        c.avg = c.points.reduce((a, b) => a + b, 0) / c.points.length;
        c.min = Math.min(c.min, p);
        c.max = Math.max(c.max, p);
        merged = true;
        break;
      }
    }
    if (!merged) clusters.push({ points: [p], avg: p, min: p, max: p });
  });
  const levels = clusters.map((c) => ({ price: c.avg, min: c.min, max: c.max, touches: c.points.length })).filter((c) => c.touches >= 2);
  const support = levels.filter((l) => l.price < currentPrice).sort((a, b) => b.price - a.price);
  const resistance = levels.filter((l) => l.price > currentPrice).sort((a, b) => a.price - b.price);
  const nearestSupport = support[0] || null;
  const nearestResistance = resistance[0] || null;
  if (nearestSupport) nearestSupport.bounceStats = computeZoneProbability(closes, nearestSupport.price, 'support');
  if (nearestResistance) nearestResistance.bounceStats = computeZoneProbability(closes, nearestResistance.price, 'resistance');
  return { nearestSupport, nearestResistance };
}

export function detectEngulfingMarkers(ohlc) {
  const markers = [];
  for (let i = 1; i < ohlc.length; i++) {
    const prev = ohlc[i - 1], curr = ohlc[i];
    const prevBearish = prev.close < prev.open;
    const prevBullish = prev.close > prev.open;
    const currBullish = curr.close > curr.open;
    const currBearish = curr.close < curr.open;
    if (prevBearish && currBullish && curr.open <= prev.close && curr.close >= prev.open) {
      markers.push({ time: curr.time, position: 'belowBar', color: '#3FB68B', shape: 'arrowUp', text: 'Engulfing alcista' });
    } else if (prevBullish && currBearish && curr.open >= prev.close && curr.close <= prev.open) {
      markers.push({ time: curr.time, position: 'aboveBar', color: '#E1615A', shape: 'arrowDown', text: 'Engulfing bajista' });
    }
  }
  return markers;
}

