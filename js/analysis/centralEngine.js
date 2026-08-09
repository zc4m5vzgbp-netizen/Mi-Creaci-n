// Motor Central — combina los resultados YA calculados por los demás motores
// en puntajes 0-100 por dimensión. Nunca depende de una sola señal, y las
// dimensiones sin datos simplemente se excluyen del promedio (no se inventan).

// Voto por mayoría simple entre RSI, MACD y Stochastic — cada uno cuenta 1 voto
// igual, sin pesos. Reemplaza el sistema anterior de puntos aditivos (+15/-15...)
// que no tenía justificación estadística para esos números específicos.
export function computeMomentumComposite(ind) {
  let bullish = 0, bearish = 0, total = 0;

  if (ind.rsi14 != null) {
    total++;
    if (ind.rsi14 >= 50) bullish++; else bearish++;
  }
  if (ind.macd && ind.macd.line != null && ind.macd.signal != null) {
    total++;
    if (ind.macd.line > ind.macd.signal) bullish++; else bearish++;
  }
  if (ind.stochastic) {
    total++;
    if (ind.stochastic.k > 50) bullish++; else bearish++;
  }

  return total ? Math.round((bullish / total) * 100) : null;
}

// ADX aporta SOLO la magnitud (qué tan fuerte es la tendencia) — la dirección
// viene exclusivamente de +DI vs -DI, nunca del valor de ADX en sí, porque ADX
// no mide dirección. +DI=-DI exacto → neutral (50). ADX está acotado 0-100 por
// su propia fórmula, así que /2 es el mapeo directo a un rango de +/-50 sin
// inventar ningún tope adicional.
export function computeTrendStrengthScore(adx) {
  if (!adx) return null;
  const magnitude = adx.adx / 2;
  if (adx.plusDI > adx.minusDI) return Math.round(Math.min(100, 50 + magnitude));
  if (adx.minusDI > adx.plusDI) return Math.round(Math.max(0, 50 - magnitude));
  return 50;
}

// Mapeo binario directo, sin magnitudes intermedias inventadas: alcista=100,
// bajista=0. "Indefinida" se excluye del promedio en vez de forzar un punto medio.
export function computeMarketStructureScore(structure) {
  if (!structure || structure.structure === 'indefinida') return null;
  return structure.structure === 'alcista' ? 100 : 0;
}

export function computeVolumeScore(ind) {
  let score = 50, has = false;
  if (ind.volumeEngine && ind.volumeEngine.accumDist) {
    has = true;
    score += ind.volumeEngine.accumDist.trend === 'acumulación' ? 20 : -20;
  }
  if (ind.avgVolume20 && ind.todayVolume) {
    has = true;
    const ratio = ind.todayVolume / ind.avgVolume20;
    if (ratio >= 1.3) score += 15; else if (ratio < 0.7) score -= 10;
  }
  return has ? Math.max(0, Math.min(100, score)) : null;
}

export function computeOptionsScoreFromWalls(gex, currentPrice) {
  if (!gex || gex.callWall == null || gex.putWall == null || !currentPrice) return null;
  const range = gex.callWall - gex.putWall;
  if (range <= 0) return null;
  const position = (currentPrice - gex.putWall) / range;
  return Math.round(Math.max(0, Math.min(100, (1 - position) * 100)));
}

export function computeNewsScore(newsTally) {
  if (!newsTally) return null;
  const net = (newsTally.buena - newsTally.mala) / newsTally.total;
  return Math.round(Math.max(0, Math.min(100, 50 + net * 50)));
}

// Ya no se llama "sentimiento" — nunca fue más que volatilidad, el nombre viejo
// ocultaba eso. Misma matemática exacta, ahora es su propia dimensión honesta.
export function computeVolatilityScore(volatilityRegime) {
  if (!volatilityRegime) return null;
  if (volatilityRegime.rising) return 35;
  if (volatilityRegime.falling) return 65;
  return 50;
}

export function computeCentralScore(inputs) {
  const dims = {};
  if (inputs.trendDirectionScore != null) dims.trendDirection = inputs.trendDirectionScore;
  if (inputs.trendStrengthScore != null) dims.trendStrength = inputs.trendStrengthScore;
  if (inputs.marketStructureScore != null) dims.marketStructure = inputs.marketStructureScore;
  if (inputs.momentumScore != null) dims.momentum = inputs.momentumScore;
  if (inputs.volumeScore != null) dims.volumen = inputs.volumeScore;
  if (inputs.newsScore != null) dims.noticias = inputs.newsScore;
  if (inputs.optionsScore != null) dims.opciones = inputs.optionsScore;
  if (inputs.volatilityScore != null) dims.volatilidad = inputs.volatilityScore;

  const values = Object.values(dims);
  if (values.length === 0) return null;

  const avgScore = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - avgScore) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  // 50 = máximo teórico demostrado de la desviación estándar poblacional para
  // cualquier conjunto de valores acotados en [0,100] (se alcanza exactamente
  // cuando los valores se dividen mitad-mitad entre los dos extremos del rango
  // — no es un umbral elegido a mano). signalStrength mide solo qué tanto
  // concuerdan las dimensiones entre sí, sin indicar hacia qué lado.
  const signalStrength = Math.round((1 - Math.min(stdDev / 50, 1)) * 100);

  const bullishCount = values.filter((v) => v > 50).length;
  const bearishCount = values.filter((v) => v < 50).length;
  let direction = 'Mixta';
  if (bullishCount > bearishCount) direction = 'Alcista';
  else if (bearishCount > bullishCount) direction = 'Bajista';

  return { dims, avgScore, signalStrength, direction, dimCount: values.length };
}
