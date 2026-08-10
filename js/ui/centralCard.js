import { state } from '../state.js';
import { computeNewsSentimentTally } from '../analysis/sentimentEngine.js';
import { computeVolumeScore, computeOptionsScoreFromWalls, computeNewsScore, computeCentralScore, computeStatisticalConfidence } from '../analysis/centralEngine.js';

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
  const statConf = computeStatisticalConfidence(prob);

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:4px;">Motor Central</div>
    <div class="dim" style="font-size:11px; margin-bottom:12px;">Combina ${central.dimCount} de 8 dimensiones disponibles hoy — nunca depende de una sola señal.</div>

    <div style="text-align:center; padding:4px 0 14px;">
      <div class="dim" style="font-size:10.5px; letter-spacing:1px; text-transform:uppercase; margin-bottom:3px;">Dirección dominante</div>
      <div class="mono" style="font-size:24px; font-weight:700;">${central.direction}</div>
    </div>

    <div class="stat-grid" style="margin-bottom:14px;">
      <div class="stat-box">
        <div class="dim">Alineación de señales ⓘ</div>
        <div class="mono tag-neutral">${central.signalStrength}%</div>
      </div>
      <div class="stat-box">
        <div class="dim">Confianza estadística ⓘ</div>
        <div class="mono tag-neutral">${statConf != null ? statConf.value + '%' : 'sin datos'}</div>
      </div>
    </div>

    <div class="dim" style="font-size:10px; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">Dimensiones</div>
    <div class="dim-row"><span>Dirección de tendencia</span><span class="mono">${central.dims.trendDirection != null ? Math.round(central.dims.trendDirection) : '—'}</span></div>
    <div class="dim-row"><span>Fuerza de tendencia</span><span class="mono">${central.dims.trendStrength != null ? Math.round(central.dims.trendStrength) : '—'}</span></div>
    <div class="dim-row"><span>Estructura de mercado</span><span class="mono">${central.dims.marketStructure != null ? Math.round(central.dims.marketStructure) : '—'}</span></div>
    <div class="dim-row"><span>Momentum</span><span class="mono">${central.dims.momentum != null ? Math.round(central.dims.momentum) : '—'}</span></div>
    <div class="dim-row"><span>Volumen</span><span class="mono">${central.dims.volumen != null ? Math.round(central.dims.volumen) : '—'}</span></div>
    <div class="dim-row"><span>Noticias</span><span class="mono">${central.dims.noticias != null ? Math.round(central.dims.noticias) : '—'}</span></div>
    <div class="dim-row"><span>Opciones</span><span class="mono">${central.dims.opciones != null ? Math.round(central.dims.opciones) : '—'}</span></div>
    <div class="dim-row"><span>Volatilidad</span><span class="mono">${central.dims.volatilidad != null ? Math.round(central.dims.volatilidad) : '—'}</span></div>

    ${prob ? `
    <div style="border-top:1px solid var(--hairline); margin-top:12px; padding-top:10px;">
      <div class="indicator-row"><div class="indicator-label">Frecuencia histórica condicional alcista</div><div class="mono tag-good">${prob.upPct.toFixed(0)}%</div></div>
      <div class="indicator-row"><div class="indicator-label">Frecuencia histórica condicional bajista</div><div class="mono tag-bad">${prob.downPct.toFixed(0)}%</div></div>
    </div>` : ''}

    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Alineación de señales: qué tanto concuerdan las dimensiones entre sí — no indica dirección ni probabilidad. Confianza estadística: qué tan preciso es el intervalo de Wilson de la frecuencia histórica seleccionada (${statConf ? statConf.source : '—'}) — no una probabilidad de que suba o baje. Las dimensiones sin datos hoy (ej. Opciones, si no consultaste GEX) no cuentan en el promedio.</div>
  `;
}
