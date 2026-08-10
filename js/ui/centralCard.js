import { state } from '../state.js';
import { computeNewsSentimentTally } from '../analysis/sentimentEngine.js';
import { computeVolumeScore, computeOptionsScoreFromWalls, computeNewsScore, computeCentralScore, computeStatisticalConfidence } from '../analysis/centralEngine.js';
import { tipIcon, tipBody } from './tooltip.js';

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
      <div class="dim" style="font-size:10.5px; letter-spacing:1px; text-transform:uppercase; margin-bottom:3px;">Dirección dominante ${tipIcon('tip-direction')}</div>
      <div class="mono" style="font-size:24px; font-weight:700;">${central.direction}</div>
    </div>
    ${tipBody('tip-direction', '<strong>Qué significa:</strong> cuenta cuántas de las 8 dimensiones están por encima de 50 (alcistas) contra cuántas están por debajo (bajistas) — la que tenga más, gana.<br><br><strong>Importante:</strong> es un conteo directo, no una predicción garantizada.')}

    <div class="stat-grid" style="margin-bottom:14px;">
      <div class="stat-box">
        <div class="dim">Alineación de señales ${tipIcon('tip-signalstrength')}</div>
        <div class="mono tag-neutral">${central.signalStrength}%</div>
      </div>
      <div class="stat-box">
        <div class="dim">Confianza estadística ${tipIcon('tip-statconf')}</div>
        <div class="mono tag-neutral">${statConf != null ? statConf.value + '%' : 'sin datos'}</div>
      </div>
      ${tipBody('tip-signalstrength', '<strong>Qué significa:</strong> qué tan alineadas están entre sí las 8 dimensiones del Motor Central.<br><br><strong>Importante:</strong> no indica si el precio va a subir o bajar — un valor alto puede darse con señales muy alcistas o muy bajistas, siempre que concuerden entre sí.')}
      ${tipBody('tip-statconf', `<strong>Qué significa:</strong> qué tan angosto es el intervalo de Wilson del resultado histórico más frecuente (${statConf ? statConf.source : 'sin datos'}).<br><br><strong>Importante:</strong> un porcentaje mayor significa una estimación más precisa — no una mayor probabilidad de que el precio suba o baje.`)}
    </div>

    <div class="dim" style="font-size:10px; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">Dimensiones</div>
    <div class="dim-row"><span>Dirección de tendencia ${tipIcon('tip-trenddir')}</span><span class="mono">${central.dims.trendDirection != null ? Math.round(central.dims.trendDirection) : '—'}</span></div>
    ${tipBody('tip-trenddir', '<strong>Cómo funciona:</strong> combina SuperTrend, precio vs. SMA50, y precio vs. EMA200 en un solo voto, cada uno con el mismo peso. El resultado es el % de esas 3 señales que están alcistas.')}
    <div class="dim-row"><span>Fuerza de tendencia ${tipIcon('tip-trendstr')}</span><span class="mono">${central.dims.trendStrength != null ? Math.round(central.dims.trendStrength) : '—'}</span></div>
    ${tipBody('tip-trendstr', '<strong>Cómo funciona:</strong> usa ADX para medir qué tan fuerte es la tendencia (no la dirección), y +DI/-DI para saber hacia qué lado. ADX alto + DI+ dominante = fuerza alcista; ADX alto + DI- dominante = fuerza bajista.')}
    <div class="dim-row"><span>Estructura de mercado ${tipIcon('tip-structure')}</span><span class="mono">${central.dims.marketStructure != null ? Math.round(central.dims.marketStructure) : '—'}</span></div>
    ${tipBody('tip-structure', '<strong>Cómo funciona:</strong> estructura de mercado detectada (rompimientos BOS/CHoCH) — se traduce en alcista, bajista, o queda excluida si no hay una lectura clara.')}
    <div class="dim-row"><span>Momentum ${tipIcon('tip-momentum')}</span><span class="mono">${central.dims.momentum != null ? Math.round(central.dims.momentum) : '—'}</span></div>
    ${tipBody('tip-momentum', '<strong>Cómo funciona:</strong> combina RSI, MACD y Estocástico en un solo voto, cada uno con el mismo peso (RSI≥50, MACD línea por encima de su señal, Estocástico %K>50 = voto alcista). El resultado es el % de votos alcistas.')}
    <div class="dim-row"><span>Volumen</span><span class="mono">${central.dims.volumen != null ? Math.round(central.dims.volumen) : '—'}</span></div>
    <div class="dim-row"><span>Noticias</span><span class="mono">${central.dims.noticias != null ? Math.round(central.dims.noticias) : '—'}</span></div>
    <div class="dim-row"><span>Opciones</span><span class="mono">${central.dims.opciones != null ? Math.round(central.dims.opciones) : '—'}</span></div>
    <div class="dim-row"><span>Volatilidad</span><span class="mono">${central.dims.volatilidad != null ? Math.round(central.dims.volatilidad) : '—'}</span></div>

    ${prob ? `
    <div style="border-top:1px solid var(--hairline); margin-top:12px; padding-top:10px;">
      <div class="indicator-row"><div class="indicator-label">Frecuencia histórica condicional alcista ${tipIcon('tip-freqhist')}</div><div class="mono tag-good">${prob.upPct.toFixed(0)}%</div></div>
      <div class="indicator-row"><div class="indicator-label">Frecuencia histórica condicional bajista</div><div class="mono tag-bad">${prob.downPct.toFixed(0)}%</div></div>
      ${tipBody('tip-freqhist', '<strong>Qué significa:</strong> qué tan seguido ocurrió este resultado en el pasado, en situaciones parecidas a la de hoy.<br><br><strong>Importante:</strong> es historia, no una predicción de lo que va a pasar.')}
    </div>` : ''}

    <div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px; line-height:1.4;">Alineación de señales: qué tanto concuerdan las dimensiones entre sí — no indica dirección ni probabilidad. Confianza estadística: qué tan preciso es el intervalo de Wilson de la frecuencia histórica seleccionada (${statConf ? statConf.source : '—'}) — no una probabilidad de que suba o baje. Las dimensiones sin datos hoy (ej. Opciones, si no consultaste GEX) no cuentan en el promedio.</div>
  `;
}
