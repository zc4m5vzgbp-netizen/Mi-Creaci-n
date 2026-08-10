import { HISTORY_DAYS, CHART_DISPLAY_DAYS } from '../constants.js';
import { state } from '../state.js';
import { fmtPrice, timeAgo, escapeHTML } from '../utils/format.js';
import { extractJSONArray } from '../utils/dom.js';
import { renderExtraNews } from '../ui/newsCards.js';
import { renderSentimentCard } from '../ui/sentimentCard.js';
import { renderCentralCard } from '../ui/centralCard.js';
import { computeNewsSentimentTally, computeOverallSentiment } from '../analysis/sentimentEngine.js';
import { computeVolumeScore, computeOptionsScoreFromWalls, computeNewsScore, computeCentralScore, computeStatisticalConfidence } from '../analysis/centralEngine.js';
import { computeYoY } from '../ui/fundamentalCard.js';
import { computeZoneContext } from '../analysis/priceAction.js';

function wilsonPromptText(wilson) {
  if (!wilson) return '';
  return ` (IC 95% Wilson: ${Math.round(wilson.lower * 100)}%–${Math.round(wilson.upper * 100)}%)`;
}

function zoneContextText(context) {
  const parts = [];
  if (context.fibonacci) {
    if (context.fibonacci.inside.length) parts.push(`Fibonacci ${context.fibonacci.inside.join('%, ')}% dentro de la zona`);
    else if (context.fibonacci.nearest) parts.push(`Fibonacci ${context.fibonacci.nearest.name}% a $${fmtPrice(context.fibonacci.nearest.dist)} ${context.fibonacci.nearest.above ? 'arriba' : 'abajo'} de la zona`);
  }
  if (context.pivot) {
    if (context.pivot.inside.length) parts.push(`Pivot ${context.pivot.inside.join(', ')} dentro de la zona`);
    else if (context.pivot.nearest) parts.push(`Pivot ${context.pivot.nearest.name} a $${fmtPrice(context.pivot.nearest.dist)} ${context.pivot.nearest.above ? 'arriba' : 'abajo'} de la zona`);
  }
  if (context.atrDistance != null) parts.push(`distancia ${context.atrDistance.toFixed(1)} ATR`);
  if (context.volumeAbnormal) parts.push(`volumen ${context.volumeAbnormal} reciente`);
  if (context.structureCompatible) parts.push(`estructura de mercado ${context.structureCompatible}`);
  if (!parts.length) return '';
  return ` Contexto descriptivo de la zona (NO es evidencia estadística, no lo sumes ni lo interpretes como probabilidad — es solo información complementaria): ${parts.join('; ')}.`;
}

export async function translateNews(symbol) {
  if (!state.aiProxyUrl || !state.aiProxyPassword) return;
  const newsData = state.newsCache[symbol];
  if (!newsData || !newsData.items || newsData.items.length === 0) return;
  const statusEl = document.getElementById('newsTranslateStatus');
  if (statusEl) statusEl.textContent = 'Traduciendo…';

  const list = newsData.items.map((item, i) => `${i}. ${item.headline}`).join('\n');
  const prompt = `Traduce estos titulares de noticias financieras al español, de forma natural (no literal), y clasifica cada uno como "buena", "normal" o "mala" noticia para el precio de la acción, según el contenido del titular. Responde ÚNICAMENTE con un array JSON válido, sin texto adicional ni bloques de código, con este formato exacto: [{"i":0,"es":"texto traducido","tono":"buena"}]. Titulares:\n${list}`;

  try {
    const res = await fetch(state.aiProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, password: state.aiProxyPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo traducir.');
    const text = (data.content || []).map((c) => (c.type === 'text' ? c.text : '')).filter(Boolean).join('\n');
    const arr = extractJSONArray(text);
    const translations = {};
    arr.forEach((item) => {
      if (item && item.i != null) translations[item.i] = { es: item.es, tono: item.tono };
    });
    newsData.translations = translations;
    if (statusEl) statusEl.textContent = '';
    renderSentimentCard();
    renderCentralCard();
    renderExtraNews();
  } catch (e) {
    if (statusEl) statusEl.textContent = 'No se pudo traducir. Intenta de nuevo.';
  }
}

export async function fetchAIAnalysis(symbol) {
  if (!state.aiProxyUrl) return;
  const box = document.getElementById('aiAnalysisBox');
  if (!box) return;

  if (!state.aiProxyPassword) {
    box.innerHTML = '<div class="dim" style="font-size:13px;">Agrega la palabra clave del intermediario en ⚙ para usar esto.</div>';
    return;
  }

  box.innerHTML = '<div class="dim loading-pulse" style="font-size:13px;">Pensando… puede tardar hasta un minuto.</div>';

  const q = state.cache[symbol];
  if (!q || q.error || q.price == null) {
    box.innerHTML = '<div class="dim" style="font-size:13px;">Espera a que cargue la cotización primero.</div>';
    return;
  }
  const ind = state.indicatorsCache[symbol];
  const newsData = state.newsCache[symbol];

  const priceLines = [];
  priceLines.push(`${symbol} (${q.name || symbol}), precio actual $${fmtPrice(q.price)}, cambio hoy ${(q.changePct ?? 0).toFixed(2)}%`);
  priceLines.push(`Apertura $${fmtPrice(q.open)}, máximo $${fmtPrice(q.high)}, mínimo $${fmtPrice(q.low)}, cierre anterior $${fmtPrice(q.prevClose)}`);

  if (ind && !ind.loading && !ind.error) {
    if (ind.sma20 != null) priceLines.push(`SMA20: $${fmtPrice(ind.sma20)}`);
    if (ind.sma50 != null) priceLines.push(`SMA50: $${fmtPrice(ind.sma50)}`);
    if (ind.rsi14 != null) priceLines.push(`RSI(14): ${ind.rsi14.toFixed(1)}`);
    if (ind.macd && ind.macd.line != null) priceLines.push(`MACD línea: ${ind.macd.line.toFixed(2)}, señal: ${ind.macd.signal != null ? ind.macd.signal.toFixed(2) : 'N/D'}`);
    if (ind.avgVolume20 && ind.todayVolume) priceLines.push(`Volumen de hoy vs promedio 20 días: ${(ind.todayVolume / ind.avgVolume20).toFixed(2)}x`);

    if (ind.recentCloses && ind.recentCloses.length >= 6) {
      const rc = ind.recentCloses;
      const last = rc[rc.length - 1];
      const c5 = rc.length >= 6 ? rc[rc.length - 6] : null;
      const c10 = rc.length >= 11 ? rc[rc.length - 11] : null;
      if (c5) priceLines.push(`Cambio en los últimos 5 días de cotización: ${(((last - c5) / c5) * 100).toFixed(2)}%`);
      if (c10) priceLines.push(`Cambio en los últimos 10 días de cotización: ${(((last - c10) / c10) * 100).toFixed(2)}%`);
    }

    if (ind.priceAction) {
      const price = ind.lastClose;
      if (ind.priceAction.nearestSupport) {
        const sup = ind.priceAction.nearestSupport;
        const distPct = ((price - sup.price) / price) * 100;
        let line = `Zona de soporte/demanda más cercana: $${fmtPrice(sup.min)}–$${fmtPrice(sup.max)} (${sup.touches} toques históricos como pivote), a ${distPct.toFixed(1)}% por debajo del precio actual.`;
        if (sup.bounceStats && sup.bounceStats.approaches > 0) {
          line += ` Frecuencia histórica condicional de rebote al acercarse a esta zona en los últimos ${HISTORY_DAYS} días (no es una predicción): ${Math.round(sup.bounceStats.bounceRate * 100)}%${wilsonPromptText(sup.bounceStats.wilson)} (rebotó ${sup.bounceStats.bounces} de ${sup.bounceStats.approaches} veces que el precio se acercó).`;
        } else {
          line += ' No hay suficientes acercamientos históricos para calcular una frecuencia confiable.';
        }
        line += zoneContextText(computeZoneContext(sup, 'support', price, ind));
        priceLines.push(line);
      }
      if (ind.priceAction.nearestResistance) {
        const res = ind.priceAction.nearestResistance;
        const distPct = ((res.price - price) / price) * 100;
        let line = `Zona de resistencia/oferta más cercana: $${fmtPrice(res.min)}–$${fmtPrice(res.max)} (${res.touches} toques históricos como pivote), a ${distPct.toFixed(1)}% por encima del precio actual.`;
        if (res.bounceStats && res.bounceStats.approaches > 0) {
          line += ` Frecuencia histórica condicional de rebote (rechazo) al acercarse a esta zona en los últimos ${HISTORY_DAYS} días (no es una predicción): ${Math.round(res.bounceStats.bounceRate * 100)}%${wilsonPromptText(res.bounceStats.wilson)} (rebotó ${res.bounceStats.bounces} de ${res.bounceStats.approaches} veces que el precio se acercó).`;
        } else {
          line += ' No hay suficientes acercamientos históricos para calcular una frecuencia confiable.';
        }
        line += zoneContextText(computeZoneContext(res, 'resistance', price, ind));
        priceLines.push(line);
      }
      if (ind.priceAction.nearestSupport && ind.priceAction.nearestResistance) {
        const risk = price - ind.priceAction.nearestSupport.price;
        const reward = ind.priceAction.nearestResistance.price - price;
        if (risk > 0 && reward > 0) {
          priceLines.push(`Relación riesgo/recompensa (resistencia vs. soporte): 1 : ${(reward / risk).toFixed(1)}`);
        }
      }
    }
    if (ind.recentEngulfingCount != null) {
      priceLines.push(`Patrones de velas Engulfing detectados matemáticamente en los últimos ${CHART_DISPLAY_DAYS} días: ${ind.recentEngulfingCount} (el más reciente: ${ind.lastEngulfingType || 'ninguno reciente'})`);
    }
    if (ind.adx) priceLines.push(`ADX: ${ind.adx.adx.toFixed(1)} (fuerza de tendencia; ${ind.adx.plusDI > ind.adx.minusDI ? 'sesgo alcista' : 'sesgo bajista'} según DI+/DI-)`);
    if (ind.superTrend) priceLines.push(`SuperTrend: ${ind.superTrend.direction}`);
    if (ind.smartMoney) {
      const sm = ind.smartMoney;
      if (sm.structure) {
        priceLines.push(`Estructura de mercado (Smart Money): ${sm.structure.structure}${sm.structure.event ? `, con un ${sm.structure.event.type} reciente (${sm.structure.event.direction})` : ', sin rompimiento de estructura reciente'}`);
      }
      if (sm.premiumDiscount) {
        priceLines.push(`Zona premium/discount (Smart Money): el precio está en ${sm.premiumDiscount.zone} de su rango de ~90 días (${sm.premiumDiscount.positionPct.toFixed(0)}%)`);
      }
      if (sm.fairValueGaps && sm.fairValueGaps.length > 0) {
        priceLines.push(`Fair Value Gaps sin llenar detectados: ${sm.fairValueGaps.length}`);
      }
    }
    if (ind.volumeEngine) {
      const v = ind.volumeEngine;
      if (v.abnormal) priceLines.push(`Volumen de hoy: ${v.abnormal.level} (comparado estadísticamente con los últimos 20 días)`);
      if (v.accumDist) priceLines.push(`Acumulación/Distribución (indicador real, no aproximado): ${v.accumDist.trend}`);
      if (v.climax) priceLines.push(`${v.climax.type} detectado: ${v.climax.desc}`);
      if (v.absorption && v.absorption.detected) priceLines.push(`Absorción detectada: ${v.absorption.desc}`);
    }
    if (ind.directionalProbability) {
      const dp = ind.directionalProbability;
      priceLines.push(`Frecuencia histórica condicional (Motor de Probabilidades, contada sobre ${dp.sample} configuraciones parecidas del pasado, ventanas no solapadas — no es una predicción): subió ${dp.upPct.toFixed(0)}%${wilsonPromptText(dp.wilsonUp)} de las veces, consolidó ${dp.flatPct.toFixed(0)}%${wilsonPromptText(dp.wilsonFlat)}, bajó ${dp.downPct.toFixed(0)}%${wilsonPromptText(dp.wilsonDown)}, en los siguientes ${dp.lookAheadDays} días de cotización`);
    }

    const newsDataForSentiment = state.newsCache[symbol];
    const newsTallyForSentiment = computeNewsSentimentTally(newsDataForSentiment);
    if (ind.sentiment) {
      const overall = computeOverallSentiment(ind.sentiment.trend, ind.sentiment.volatilityRegime, newsTallyForSentiment);
      priceLines.push(`Sentimiento general calculado (combinando tendencia, volatilidad y noticias): ${overall.label} (${overall.score.toFixed(0)}/100)`);
    }

    const gexForPrompt = state.gexCache[symbol];
    if (gexForPrompt && !gexForPrompt.loading && !gexForPrompt.error) {
      priceLines.push(`Opciones — Call Wall (resistencia real de opciones): $${fmtPrice(gexForPrompt.callWall)}, Put Wall (soporte real de opciones): $${fmtPrice(gexForPrompt.putWall)}`);
    }

    if (q.earnings && q.earnings.length > 0) {
      const sortedEarnings = q.earnings.slice().sort((a, b) => (b.period || '').localeCompare(a.period || ''));
      const lastE = sortedEarnings[0];
      if (lastE && lastE.actual != null && lastE.estimate != null) {
        priceLines.push(`Último resultado trimestral (${lastE.period}): EPS real ${lastE.actual} vs. estimado ${lastE.estimate} (${lastE.surprisePercent != null ? (lastE.surprisePercent > 0 ? 'superó' : 'no alcanzó') + ' expectativas por ' + Math.abs(lastE.surprisePercent).toFixed(1) + '%' : ''})`);
      }
    }
    if (state.macroCache && state.macroCache.data && !state.macroCache.loading && !state.macroCache.error) {
      const md = state.macroCache.data;
      const cpi = computeYoY(md.cpi, 12);
      const fedRate = md.fedRate && md.fedRate[0] ? parseFloat(md.fedRate[0].value) : null;
      if (cpi) priceLines.push(`Contexto macro general (no específico de esta acción): CPI interanual ${cpi.yoyPct.toFixed(1)}%${fedRate != null ? `, tasa de la Reserva Federal ${fedRate.toFixed(2)}%` : ''}`);
    }

    const cd = ind.centralDims || {};
    const centralInputs = {
      trendDirectionScore: cd.trendDirection,
      trendStrengthScore: cd.trendStrength,
      marketStructureScore: cd.marketStructure,
      momentumScore: cd.momentumComposite,
      volumeScore: computeVolumeScore(ind),
      newsScore: computeNewsScore(newsTallyForSentiment),
      optionsScore: computeOptionsScoreFromWalls(gexForPrompt, ind.lastClose),
      volatilityScore: cd.volatilityScore,
    };
    const central = computeCentralScore(centralInputs);
    if (central) {
      const dimLines = Object.entries(central.dims).map(([k, v]) => `${k}: ${Math.round(v)}/100`).join(', ');
      const statConf = computeStatisticalConfidence(ind.directionalProbability);
      const statConfText = statConf ? ` Confianza estadística: ${statConf.value}% (basada en el ancho del intervalo de Wilson de ${statConf.source} — mide qué tan precisa es esa estimación histórica, NO qué tan probable es que el precio suba o baje; nunca la confundas con Signal Strength ni con Direction, son 3 conceptos distintos).` : '';
      priceLines.push(`Motor Central (promedio de ${central.dimCount} de 8 dimensiones, calculado matemáticamente — no inventado): puntaje general ${Math.round(central.avgScore)}/100, dirección dominante ${central.direction}, alineación de señales (Signal Strength) ${central.signalStrength}% — qué tanto concuerdan las dimensiones entre sí, sin indicar dirección (más alto cuando coinciden, más bajo cuando se contradicen).${statConfText} Desglose: ${dimLines}.`);
    }
  } else {
    priceLines.push('(Sin indicadores ni zonas de precio disponibles todavía — solo hay precio en vivo)');
  }

  const newsLines = [];
  if (newsData && !newsData.loading && !newsData.error && newsData.items && newsData.items.length > 0) {
    newsData.items.slice(0, 4).forEach((item) => {
      newsLines.push(`- [${item.source || 'Finnhub'}, hace ${timeAgo(item.datetime)}] ${item.headline}`);
    });
  }

  const prompt = `Eres un analista financiero institucional que le explica su análisis a un cliente en español, de forma natural, clara y directa, sin jerga innecesaria ni frases robóticas. Tienes acceso a datos reales de precio, indicadores técnicos, zonas de oferta/demanda, estructura de mercado (Smart Money), volumen, probabilidades históricas reales, sentimiento calculado, contexto fundamental/macro, opciones, y un Motor Central que ya combinó varias señales en puntajes — TODO esto ya viene calculado matemáticamente, tú NO debes inventar ni recalcular ningún número, solo interpretarlos y explicarlos.

Estructura tu respuesta en estos bloques, con encabezados cortos:
1. Qué está ocurriendo — resumen del panorama actual en 2-3 frases.
2. Qué variables coinciden — qué señales apuntan en la misma dirección entre sí.
3. Qué variables generan conflicto — qué señales se contradicen entre sí, y sé honesto si la imagen es mixta.
4. Qué riesgos existen — con base en los datos reales que tienes (volatilidad, resistencias cercanas, contexto macro, etc.).
5. Qué escenarios son más probables — usando las probabilidades históricas reales que te doy, no una predicción tuya.

Nunca dés una instrucción de "compra" o "vende" — solo describe el panorama para que la persona decida por su cuenta. Si falta información en alguna de las cinco partes, dilo claramente en vez de rellenar con algo inventado.

Sobre la frecuencia histórica condicional que ves en los datos: describe lo que ocurrió en el pasado en situaciones similares — NO es una predicción ni una garantía de que el activo va a subir o bajar. Nunca conviertas, por ejemplo, "70% histórico" en "70% de probabilidad de que suba" — son afirmaciones distintas, y la segunda es una promesa que no podemos hacer. Donde veas un intervalo IC 95% (Wilson) junto a un porcentaje, ese rango representa la incertidumbre estadística real de la muestra: un intervalo angosto significa un estimador más preciso, uno amplio significa que la muestra es chica y hay que comunicarlo con cautela, incluso si el porcentaje central se ve alto.

Datos reales de hoy para ${symbol}:\n\n${priceLines.join('\n')}\n\n${newsLines.length ? `Noticias reales recientes (menciona si ayudan a explicar lo que ves, sin inventar nada que no esté aquí):\n${newsLines.join('\n')}` : 'No hay noticias recientes cargadas — no las menciones.'}`;

  try {
    const res = await fetch(state.aiProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, password: state.aiProxyPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo generar el análisis.');
    const text = (data.content || [])
      .map((c) => (c.type === 'text' ? c.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();
    if (!text) throw new Error('La IA no devolvió texto.');
    box.innerHTML = `<div style="font-size:13.5px; line-height:1.6; white-space:pre-wrap;">${escapeHTML(text)}</div><div style="font-size:10.5px; color:var(--paper-dim); font-style:italic; margin-top:10px;">Generado por IA a partir de tus datos reales y cálculos matemáticos de hoy. No es una recomendación de inversión.</div>`;
  } catch (e) {
    box.innerHTML = `<div style="color:var(--loss); font-size:13px; margin-bottom:8px;">${escapeHTML(e.message || 'Error al generar el análisis.')}</div><button class="btn-ghost" style="background:var(--surface-alt); border:1px solid var(--hairline); border-radius:6px; padding:6px 12px;" onclick="fetchAIAnalysis('${symbol}')">Reintentar</button>`;
  }
}
