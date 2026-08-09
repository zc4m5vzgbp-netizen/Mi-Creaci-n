import { computeWilsonInterval } from './statistics.js';

// Contexto descriptivo de una zona — NUNCA produce un score ni suma nada. Cada
// factor se informa como texto independiente. La única cifra estadística de la
// zona sigue siendo bounceStats (frecuencia histórica condicional + Wilson),
// calculada aparte por computeZoneProbability, sin tocar.
//
// Regla para Fibonacci/Pivot (sin umbral inventado): si el nivel cae DENTRO del
// rango real [min, max] de la zona, se nombra explícitamente. Si no, se informa
// su distancia real — nunca se convierte en "coincide/no coincide" con un margen
// arbitrario.
export function computeZoneContext(zone, zoneType, currentPrice, ind) {
  const context = {};

  function nearestOutside(levels) {
    const inside = [];
    let nearest = null;
    Object.entries(levels).forEach(([name, price]) => {
      if (price >= zone.min && price <= zone.max) {
        inside.push(name);
      } else {
        const dist = Math.min(Math.abs(price - zone.min), Math.abs(price - zone.max));
        if (!nearest || dist < nearest.dist) nearest = { name, dist, above: price > zone.max };
      }
    });
    return { inside, nearest };
  }

  if (ind.fibonacci) {
    context.fibonacci = nearestOutside(Object.assign({}, ind.fibonacci.levels, ind.fibonacci.extensions));
  }

  if (ind.pivotPoints) {
    const named = {};
    Object.entries(ind.pivotPoints).forEach(([k, v]) => { named[k.toUpperCase()] = v; });
    context.pivot = nearestOutside(named);
  }

  if (ind.atr14 && ind.atr14 > 0 && currentPrice != null) {
    const distDollars = zoneType === 'support'
      ? Math.max(0, currentPrice - zone.max)
      : Math.max(0, zone.min - currentPrice);
    context.atrDistance = distDollars / ind.atr14;
  }

  if (ind.volumeEngine && ind.volumeEngine.abnormal) {
    const level = ind.volumeEngine.abnormal.level;
    if (level === 'alto' || level === 'extremo') context.volumeAbnormal = level;
  }

  if (ind.smartMoney && ind.smartMoney.structure && ind.smartMoney.structure.structure) {
    const s = ind.smartMoney.structure.structure;
    if (s === 'indefinida') context.structureCompatible = 'indefinida';
    else if (zoneType === 'support') context.structureCompatible = s === 'alcista' ? 'compatible' : 'no compatible';
    else context.structureCompatible = s === 'bajista' ? 'compatible' : 'no compatible';
  }

  return context;
}

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
  return { approaches, bounces, bounceRate: bounces / approaches, wilson: computeWilsonInterval(bounces, approaches) };
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

// Detección matemática de patrones de vela Engulfing (mismo criterio que TA-Lib CDLENGULFING)
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
