import { state } from '../state.js';
import { computeNewsSentimentTally } from '../analysis/sentimentEngine.js';
import { computeVolumeScore, computeOptionsScoreFromWalls, computeNewsScore, computeCentralScore } from '../analysis/centralEngine.js';

function scoreRow(label, score) {
  if (score == null) return `<div class="indicator-row"><div class="indicator-label">${label}</div><div class="dim" style="font-size:12px;">sin datos hoy</div></div>`;
  const cls = score >= 65 ? 'tag-good' : (score <= 35 ? 'tag-bad' : 'tag-neutral');
  return `<div class="indicator-row"><div class="indicator-label">${label}</div><div class="mono ${cls}">${score}/100</div></div>`;
}

export function renderCentralCard() {
  const card = document.getElementById('centralCard');
  if (!card) return;
  if (!state.avKey) { card.innerHTML = ''; return; }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Motor Central</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores.</div>`;
    return;
  }
  if (data.error) { card.innerHTML = ''; return; }

  const newsData = state.newsCache[state.selected];
  const newsTally = computeNewsSentimentTally(newsData);
  const gex = state.gexCache[state.selected];
  const cd = data.centralDims || {};

  const central = computeCentralScore({
    trendDirectionScore: cd.trendDirection,
    trendStrengthScore: cd.trendStrength,
    marketStructureScore: cd.marketStructure,
    momentumScore: cd.momentumComposite,
    volumeScore: computeVolumeScore(data),
    newsScore: computeNewsScore(newsTally),
    optionsScore: computeOptionsScoreFromWalls(gex, data.lastClose),
    volatilityScore: cd.volatilityScore,
  });

  if (!central) {
    card.innerHTML = `<div class="card-title">Motor Central</div><div class="dim" style="font-size:13px; margin-top:10px;">No hay suficientes dimensiones calculadas todavía.</div>`;
    return;
  }

  const prob = data.directionalProbability;

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:4px;">Motor Central</div>
    <div class="dim" style="font-size:11px; margin-bottom:10px;">Combina ${central.dimCount} de 8 dimensiones disponibles hoy — nunca depende de una sola señal.</div>
    <div style="text-align:center; padding:8px 0;">
      <div class="mono" style="font-size:32px; font-weight:700;">${Math.round(central.avgScore)}<span style="font-size:16px; color:var(--paper-dim);">/100</span></div>
      <div class="dim" style="font-size:11px;">Alineación de señales: ${central.signalStrength}% · Dirección dominante: ${central.direction}</div>
    </div>
    ${scoreRow('Dirección de tendencia', central.dims.trendDirection != null ? Math.round(central.dims.trendDirection) : null)}
    ${scoreRow('Fuerza de tendencia', central.dims.trendStrength != null ? Math.round(central.dims.trendStrength) : null)}
    ${scoreRow('Estructura de mercado', central.dims.marketStructure != null ? Math.round(central.dims.marketStructure) : null)}
    ${scoreRow('Momentum', central.dims.momentum != null ? Math.round(central.dims.momentum) : null)}
    ${scoreRow('Volumen', central.dims.volumen != null ? Math.round(central.dims.volumen) : null)}
    ${scoreRow('Noticias', central.dims.noticias != null ? Math.round(central.dims.noticias) : null)}
    ${scoreRow('Opciones', central.dims.opciones != null ? Math.round(central.dims.opciones) : null)}
    ${scoreRow('Volatilidad', central.dims.volatilidad != null ? Math.round(central.dims.volatilidad) : null)}
    ${prob ? `
    <div style="border-top:1px solid var(--hairline); margin-top:10px; padding-top:10px;">
      <div class="indicator-row"><div class="indicator-label">Frecuencia histórica condicional alcista</div><div class="mono tag-good">${prob.upPct.toFixed(0)}%</div></div>
      <div class="indicator-row"><div class="indicator-label">Frecuencia histórica condicional bajista</div><div class="mono tag-bad">${prob.downPct.toFixed(0)}%</div></div>
    </div>` : ''}
    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Puntaje calculado combinando reglas matemáticas de varios motores — no es una IA adivinando. Las dimensiones sin datos hoy (por ejemplo Opciones, si no consultaste GEX) no cuentan en el promedio. La confianza baja cuando los motores se contradicen entre sí.</div>
  `;
}
