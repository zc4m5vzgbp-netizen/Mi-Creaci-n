import { HISTORY_DAYS, CHART_DISPLAY_DAYS } from '../constants.js';
import { state } from '../state.js';
import { fmtPrice, timeAgo, escapeHTML } from '../utils/format.js';
import { extractJSONArray } from '../utils/dom.js';
import { renderExtraNews } from '../ui/newsCards.js';

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
          line += ` Probabilidad histórica REAL calculada (no inventada) de rebote al acercarse a esta zona en los últimos ${HISTORY_DAYS} días: ${Math.round(sup.bounceStats.bounceRate * 100)}% (rebotó ${sup.bounceStats.bounces} de ${sup.bounceStats.approaches} veces que el precio se acercó).`;
        } else {
          line += ' No hay suficientes acercamientos históricos para calcular una probabilidad confiable.';
        }
        priceLines.push(line);
      }
      if (ind.priceAction.nearestResistance) {
        const res = ind.priceAction.nearestResistance;
        const distPct = ((res.price - price) / price) * 100;
        let line = `Zona de resistencia/oferta más cercana: $${fmtPrice(res.min)}–$${fmtPrice(res.max)} (${res.touches} toques históricos como pivote), a ${distPct.toFixed(1)}% por encima del precio actual.`;
        if (res.bounceStats && res.bounceStats.approaches > 0) {
          line += ` Probabilidad histórica REAL calculada (no inventada) de rebote (rechazo) al acercarse a esta zona en los últimos ${HISTORY_DAYS} días: ${Math.round(res.bounceStats.bounceRate * 100)}% (rebotó ${res.bounceStats.bounces} de ${res.bounceStats.approaches} veces que el precio se acercó).`;
        } else {
          line += ' No hay suficientes acercamientos históricos para calcular una probabilidad confiable.';
        }
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
  } else {
    priceLines.push('(Sin indicadores ni zonas de precio disponibles todavía — solo hay precio en vivo)');
  }

  const newsLines = [];
  if (newsData && !newsData.loading && !newsData.error && newsData.items && newsData.items.length > 0) {
    newsData.items.slice(0, 4).forEach((item) => {
      newsLines.push(`- [${item.source || 'Finnhub'}, hace ${timeAgo(item.datetime)}] ${item.headline}`);
    });
  }

  const prompt = `Eres un analista financiero que le habla a un amigo en español, de forma natural, cálida y directa, sin jerga innecesaria ni frases robóticas. Tu ENFOQUE PRINCIPAL debe ser la acción del precio: la tendencia de varios días, el momentum, el volumen, las zonas de soporte/demanda y resistencia/oferta, y si hubo patrones de velas Engulfing recientes. Te doy también probabilidades de rebote YA CALCULADAS matemáticamente sobre el historial real — úsalas tal cual te las doy, NO inventes tus propios porcentajes ni los cambies. Si no hay suficiente muestra histórica para una zona, dilo claramente en vez de inventar un número. Dedica la mayor parte del análisis (3-4 párrafos) a esto. Datos de precio y técnicos reales de hoy:\n\n${priceLines.join('\n')}\n\n${newsLines.length ? `Al final, en un párrafo corto y aparte, menciona si estas noticias reales recientes ayudan a explicar lo que ves en el precio (sin inventar nada que no esté aquí):\n${newsLines.join('\n')}` : 'No hay noticias recientes cargadas — no las menciones.'}\n\nSé honesto si la señal es mixta o si falta información, y nunca des una instrucción de "compra" o "vende", solo describe el panorama para que la persona decida por su cuenta.`;

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
