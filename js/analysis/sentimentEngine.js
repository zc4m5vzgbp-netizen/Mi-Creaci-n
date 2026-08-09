import { computeHistoricalVolatility } from './mathEngine.js';

// Compara volatilidad de corto plazo (10 días) contra la de más largo plazo (60 días).
// Volatilidad subiendo = típicamente asociado con más miedo/incertidumbre en el mercado.
export function computeVolatilityRegime(closes) {
  const shortVol = computeHistoricalVolatility(closes, 10);
  const longVol = computeHistoricalVolatility(closes, 60);
  if (!shortVol || !longVol) return null;
  const ratio = shortVol.annualizedPct / longVol.annualizedPct;
  return {
    shortVol: shortVol.annualizedPct,
    longVol: longVol.annualizedPct,
    rising: ratio >= 1.15,
    falling: ratio <= 0.85,
  };
}

// Solo SuperTrend + SMA50 + EMA200 — pregunta únicamente "¿dónde está el precio
// respecto a estas líneas?". ADX (fuerza) y Estructura viven en sus propias
// dimensiones independientes (computeTrendStrengthScore, computeMarketStructureScore
// en centralEngine.js) para no mezclar preguntas conceptualmente distintas.
export function computeTrendDirection(inputs) {
  let bullish = 0, bearish = 0, total = 0;

  if (inputs.superTrend) {
    total++;
    if (inputs.superTrend.direction === 'alcista') bullish++; else bearish++;
  }
  if (inputs.sma50 != null) {
    total++;
    if (inputs.lastClose > inputs.sma50) bullish++; else bearish++;
  }
  if (inputs.ema200 != null) {
    total++;
    if (inputs.lastClose > inputs.ema200) bullish++; else bearish++;
  }

  return { bullish, bearish, total, bullishPct: total ? (bullish / total) * 100 : null };
}

// Cuenta buena/mala/normal de las noticias YA traducidas con el botón de IA existente
// (si el usuario no lo ha usado todavía, esto devuelve null — no forzamos ese gasto aquí).
export function computeNewsSentimentTally(newsData) {
  if (!newsData || !newsData.translations) return null;
  const tr = newsData.translations;
  let buena = 0, mala = 0, normal = 0;
  Object.values(tr).forEach((t) => {
    if (t.tono === 'buena') buena++;
    else if (t.tono === 'mala') mala++;
    else normal++;
  });
  const total = buena + mala + normal;
  return total > 0 ? { buena, mala, normal, total } : null;
}

// Combina las tres señales en un puntaje 0-100 y una etiqueta. Matemática simple
// y transparente, no una IA — cada componente se puede ver por separado en la tarjeta.
export function computeOverallSentiment(trendSentiment, volatilityRegime, newsTally) {
  let score = 50;
  if (trendSentiment && trendSentiment.total > 0) {
    score += (trendSentiment.bullishPct - 50) * 0.5;
  }
  if (volatilityRegime) {
    if (volatilityRegime.rising) score -= 10;
    else if (volatilityRegime.falling) score += 5;
  }
  if (newsTally) {
    score += ((newsTally.buena - newsTally.mala) / newsTally.total) * 15;
  }
  score = Math.max(0, Math.min(100, score));
  let label = 'neutral';
  if (score >= 62) label = 'optimista';
  else if (score <= 38) label = 'pesimista';
  return { score, label };
}
