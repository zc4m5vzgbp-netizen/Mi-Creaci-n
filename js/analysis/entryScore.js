export function computeEntryScore(ind) {
  const price = ind.lastClose;
  const breakdown = [];
  let score = 0;

  const p1 = (ind.sma50 != null && price > ind.sma50) ? 20 : 0;
  score += p1;
  breakdown.push({ label: 'Tendencia mediano plazo (precio vs SMA50)', points: p1, max: 20 });

  const p2 = (ind.sma20 != null && price > ind.sma20) ? 15 : 0;
  score += p2;
  breakdown.push({ label: 'Tendencia corto plazo (precio vs SMA20)', points: p2, max: 15 });

  const p3 = (ind.sma20 != null && ind.sma50 != null && ind.sma20 > ind.sma50) ? 5 : 0;
  score += p3;
  breakdown.push({ label: 'Medias alineadas (SMA20 > SMA50)', points: p3, max: 5 });

  let p4 = 0;
  if (ind.rsi14 != null) {
    if (ind.rsi14 >= 35 && ind.rsi14 <= 55) p4 = 30;
    else if ((ind.rsi14 >= 25 && ind.rsi14 < 35) || (ind.rsi14 > 55 && ind.rsi14 <= 65)) p4 = 15;
    else if (ind.rsi14 < 25 || (ind.rsi14 > 65 && ind.rsi14 < 70)) p4 = 5;
  }
  score += p4;
  breakdown.push({ label: 'RSI en zona saludable', points: p4, max: 30 });

  const p5 = (ind.macd && ind.macd.signal != null && ind.macd.line > ind.macd.signal) ? 15 : 0;
  score += p5;
  breakdown.push({ label: 'MACD por encima de su señal', points: p5, max: 15 });

  const p6 = ind.freshCross ? 15 : 0;
  score += p6;
  breakdown.push({ label: 'Cruce alcista de MACD reciente', points: p6, max: 15 });

  let p7 = 0;
  if (ind.priceAction && ind.priceAction.nearestSupport && price > 0) {
    const distPct = ((price - ind.priceAction.nearestSupport.price) / price) * 100;
    if (distPct >= 0 && distPct <= 3) p7 = 10;
  }
  score += p7;
  breakdown.push({ label: 'Cerca de una zona de soporte fuerte (riesgo definido)', points: p7, max: 10 });

  const p8 = (ind.recentUpDay && ind.avgVolume20 && ind.todayVolume && (ind.todayVolume / ind.avgVolume20) >= 1.3) ? 10 : 0;
  score += p8;
  breakdown.push({ label: 'Volumen confirma el movimiento alcista', points: p8, max: 10 });

  const maxTotal = 20 + 15 + 5 + 30 + 15 + 15 + 10 + 10;
  let verdict = 'Débil por ahora', verdictClass = 'tag-bad';
  if (score >= maxTotal * 0.7) { verdict = 'Configuración técnica fuerte'; verdictClass = 'tag-good'; }
  else if (score >= maxTotal * 0.4) { verdict = 'Mixta / neutral'; verdictClass = 'tag-neutral'; }

  return { score, maxTotal, breakdown, verdict, verdictClass };
}

