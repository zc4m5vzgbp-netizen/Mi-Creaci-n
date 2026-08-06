import { state } from '../state.js';
import { CHART_DISPLAY_DAYS } from '../constants.js';
import { detectEngulfingMarkers } from '../analysis/priceAction.js';
import { escapeHTML } from '../utils/format.js';

let currentPriceChart = null;

export function renderPriceChart() {
  const card = document.getElementById('priceChartCard');
  if (!card) return;
  if (!state.avKey) {
    card.innerHTML = `<div class="card-title">Gráfico con patrones y zonas</div><div class="dim" style="font-size:13px; margin-top:10px;">Agrega tu clave de Alpha Vantage en ⚙ para desbloquear esto (opcional).</div>`;
    return;
  }
  const data = state.indicatorsCache[state.selected];
  if (!data || data.loading) {
    card.innerHTML = `<div class="card-title">Gráfico con patrones y zonas</div><div class="dim" style="font-size:13px; margin-top:10px;">Se calcula junto con los indicadores — toca "Analizar" arriba.</div>`;
    return;
  }
  if (data.error || !data.ohlc || data.ohlc.length === 0) {
    card.innerHTML = `<div class="card-title">Gráfico con patrones y zonas</div><div class="dim" style="font-size:13px; margin-top:10px;">No hay datos suficientes todavía.</div>`;
    return;
  }
  card.innerHTML = `
    <div class="card-title">Gráfico con patrones y zonas</div>
    <div class="dim" style="font-size:11px; margin:4px 0 10px; line-height:1.4;">Velas reales (~${CHART_DISPLAY_DAYS} días) · flechas = patrón Engulfing detectado matemáticamente · líneas punteadas = tus zonas de oferta (roja) y demanda (verde)</div>
    <div id="priceChartContainer" style="height:320px;"></div>
  `;
  requestAnimationFrame(() => buildPriceChart(data));
}

function buildPriceChart(data) {
  const container = document.getElementById('priceChartContainer');
  if (!container || typeof LightweightCharts === 'undefined') {
    if (container) container.innerHTML = '<div class="dim" style="font-size:12px;">No se pudo cargar la librería del gráfico. Revisa tu conexión y reintenta.</div>';
    return;
  }
  if (currentPriceChart) {
    try { currentPriceChart.remove(); } catch (e) {}
    currentPriceChart = null;
  }
  container.innerHTML = '';
  try {
    const chart = LightweightCharts.createChart(container, {
      layout: { background: { color: 'transparent' }, textColor: '#8B9099' },
      grid: { vertLines: { color: 'rgba(232,230,223,0.06)' }, horzLines: { color: 'rgba(232,230,223,0.06)' } },
      width: container.clientWidth || 320,
      height: 320,
      timeScale: { borderColor: 'rgba(232,230,223,0.08)' },
      rightPriceScale: { borderColor: 'rgba(232,230,223,0.08)' },
    });
    currentPriceChart = chart;
    const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: '#3FB68B', downColor: '#E1615A', borderVisible: false,
      wickUpColor: '#3FB68B', wickDownColor: '#E1615A',
    });
    const recentOhlc = (data.ohlc || []).slice(-CHART_DISPLAY_DAYS);
    candleSeries.setData(recentOhlc.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));

    const markers = detectEngulfingMarkers(recentOhlc);
    if (markers.length) LightweightCharts.createSeriesMarkers(candleSeries, markers);

    if (data.priceAction) {
      if (data.priceAction.nearestSupport) {
        candleSeries.createPriceLine({ price: data.priceAction.nearestSupport.price, color: '#3FB68B', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Demanda' });
      }
      if (data.priceAction.nearestResistance) {
        candleSeries.createPriceLine({ price: data.priceAction.nearestResistance.price, color: '#E1615A', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Oferta' });
      }
    }
    chart.timeScale().fitContent();
  } catch (e) {
    currentPriceChart = null;
    container.innerHTML = `<div class="dim" style="font-size:12px;">No se pudo dibujar el gráfico (${escapeHTML(e.message || 'error desconocido')}). Toca "Actualizar" en Indicadores para reintentar.</div>`;
  }
}
