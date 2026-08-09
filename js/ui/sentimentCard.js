import { state } from '../state.js';
import { computeNewsSentimentTally, computeOverallSentiment } from '../analysis/sentimentEngine.js';

function row(label, caption, valueHtml, signalClass) {
  return `<div class="indicator-row"><div><div class="indicator-label">${label}</div><div class="indicator-caption">${caption}</div></div><div style="text-align:right;"><div class="mono ${signalClass}" style="font-size:13px;">${valueHtml}</div></div></div>`;
}

export function renderSentimentCard() {
  const card = document.getElementById('sentimentCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Motor de Sentimiento</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores — toca "Analizar" arriba.</div>`;
    return;
  }
  if (data.error || !data.sentiment) { card.innerHTML = ''; return; }

  const newsData = state.newsCache[state.selected];
  const newsTally = computeNewsSentimentTally(newsData);
  const overall = computeOverallSentiment(data.sentiment.trend, data.sentiment.volatilityRegime, newsTally);

  const overallClass = overall.label === 'optimista' ? 'tag-good' : (overall.label === 'pesimista' ? 'tag-bad' : 'tag-neutral');

  const rows = [];

  const t = data.sentiment.trend;
  if (t && t.total > 0) {
    rows.push(row('Tendencia (voto de indicadores)', `${t.bullish} de ${t.total} señales apuntan alcistas (SuperTrend, precio vs. SMA50, precio vs. EMA200). Fuerza de tendencia (ADX) y estructura de mercado se muestran aparte, en el Motor Central.`, t.bullishPct.toFixed(0) + '% alcista', t.bullishPct >= 60 ? 'tag-good' : (t.bullishPct <= 40 ? 'tag-bad' : 'tag-neutral')));
  }

  const v = data.sentiment.volatilityRegime;
  if (v) {
    let volLabel = 'estable', volClass = 'tag-neutral';
    if (v.rising) { volLabel = 'subiendo — más incertidumbre'; volClass = 'tag-bad'; }
    else if (v.falling) { volLabel = 'bajando — más calma'; volClass = 'tag-good'; }
    rows.push(row('Régimen de volatilidad', `Corto plazo (10d): ${v.shortVol.toFixed(1)}% vs. largo plazo (60d): ${v.longVol.toFixed(1)}% anualizado.`, volLabel, volClass));
  }

  if (newsTally) {
    rows.push(row('Tono de noticias', `De ${newsTally.total} noticias traducidas: ${newsTally.buena} buenas, ${newsTally.mala} malas, ${newsTally.normal} neutrales.`, `${newsTally.buena}▲ / ${newsTally.mala}▼`, 'tag-neutral'));
  } else {
    rows.push(row('Tono de noticias', 'Aún no traduces las noticias de esta acción. Usa el botón "Traducir y ver tono con IA" en la tarjeta de noticias para incluir esto.', 'no incluido', 'tag-neutral'));
  }

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:4px;">Motor de Sentimiento</div>
    <div style="text-align:center; padding:10px 0 6px;">
      <div class="mono ${overallClass}" style="font-size:20px; font-weight:700; text-transform:uppercase;">${overall.label}</div>
      <div class="dim" style="font-size:11px; margin-top:2px;">Puntaje compuesto: ${overall.score.toFixed(0)}/100</div>
    </div>
    ${rows.join('')}
    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Cálculo matemático transparente combinando señales de tendencia, volatilidad y noticias ya traducidas — no es una IA adivinando un número. No incluye redes sociales ni VIX (no encontramos fuente gratis confiable para esos dos).</div>
  `;
}
