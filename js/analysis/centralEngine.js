// Motor Central — combina los resultados YA calculados por los demás motores
// en puntajes 0-100 por dimensión. Nunca depende de una sola señal, y las
// dimensiones sin datos simplemente se excluyen del promedio (no se inventan).

export function computeMomentumScore(ind) {
  let score = 50, has = false;
  if (ind.rsi14 != null) {
    has = true;
    if (ind.rsi14 >= 45 && ind.rsi14 <= 65) score += 15;
    else if (ind.rsi14 > 65) score += 5;
    else if (ind.rsi14 < 35) score -= 15;
    else score -= 5;
  }
  if (ind.macd && ind.macd.line != null && ind.macd.signal != null) {
    has = true;
    score += ind.macd.line > ind.macd.signal ? 15 : -15;
  }
  if (ind.stochastic) {
    has = true;
    score += ind.stochastic.k > 50 ? 10 : -10;
  }
  return has ? Math.max(0, Math.min(100, score)) : null;
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

// Deliberadamente basado SOLO en el régimen de volatilidad (no en tendencia ni
// noticias, que ya son sus propias dimensiones) para no repetir la misma señal dos veces.
export function computeSentimentScoreFromVolatility(volatilityRegime) {
  if (!volatilityRegime) return null;
  if (volatilityRegime.rising) return 35;
  if (volatilityRegime.falling) return 65;
  return 50;
}

export function computeCentralScore(inputs) {
  const dims = {};
  if (inputs.trendScore != null) dims.tendencia = inputs.trendScore;
  if (inputs.momentumScore != null) dims.momentum = inputs.momentumScore;
  if (inputs.volumeScore != null) dims.volumen = inputs.volumeScore;
  if (inputs.newsScore != null) dims.noticias = inputs.newsScore;
  if (inputs.optionsScore != null) dims.opciones = inputs.optionsScore;
  if (inputs.sentimentScore != null) dims.sentimiento = inputs.sentimentScore;

  const values = Object.values(dims);
  if (values.length === 0) return null;

  const avgScore = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - avgScore) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const completeness = values.length / 6;
  const agreement = Math.max(0, 1 - stdDev / 50);
  const confidence = Math.round((completeness * 0.4 + agreement * 0.6) * 100);

  return { dims, avgScore, confidence, dimCount: values.length };
}
