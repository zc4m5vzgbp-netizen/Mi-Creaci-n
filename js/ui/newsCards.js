import { state } from '../state.js';
import { escapeHTML, timeAgo } from '../utils/format.js';

export function renderTradingViewWidget(containerId, scriptSrc, config) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = scriptSrc;
  script.async = true;
  script.textContent = JSON.stringify(config);
  container.appendChild(script);
}

export function renderChartWidget() {
  renderTradingViewWidget('chartWidgetContainer', 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js', {
    autosize: true, symbol: state.selected, interval: 'D', timezone: 'Etc/UTC',
    theme: 'dark', style: '1', locale: 'es', allow_symbol_change: false,
  });
}

export function renderNewsWidget() {
  renderTradingViewWidget('newsWidgetContainer', 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js', {
    feedMode: 'symbol', symbol: state.selected, colorTheme: 'dark', isTransparent: true,
    displayMode: 'regular', width: '100%', height: 400, locale: 'es',
  });
}

export function renderExtraNews() {
  const box = document.getElementById('extraNewsBox');
  if (!box) return;
  if (!state.apiKey) { box.innerHTML = ''; return; }
  const data = state.newsCache[state.selected];
  if (!data || data.loading) { box.innerHTML = `<div class="dim loading-pulse" style="font-size:13px;">Cargando noticias…</div>`; return; }
  if (data.error) { box.innerHTML = `<div style="color:var(--loss); font-size:13px;">${escapeHTML(data.error)}</div>`; return; }
  if (!data.items || data.items.length === 0) { box.innerHTML = `<div class="dim" style="font-size:13px;">No hay noticias recientes para este símbolo.</div>`; return; }

  let topRow = '';
  if (state.aiProxyUrl && state.aiProxyPassword) {
    topRow = `<button class="btn-ghost scan-btn" style="margin-bottom:6px;" onclick="translateNews('${state.selected}')">Traducir y ver tono con IA</button><div id="newsTranslateStatus" class="dim" style="font-size:11px; margin-bottom:8px;"></div>`;
  } else {
    topRow = `<div class="dim" style="font-size:11px; margin-bottom:10px; line-height:1.4;">Tip gratis: mantén el dedo sobre un titular y toca "Traducir" — es una función nativa de Safari. Para traducción + tono automático, agrega tu intermediario de IA en ⚙.</div>`;
  }

  const tr = data.translations || {};
  const itemsHtml = data.items.map((item, i) => {
    const t = tr[i];
    let sentBadge = '';
    if (t && t.tono) {
      const cls = t.tono === 'buena' ? 'tag-good' : (t.tono === 'mala' ? 'tag-bad' : 'tag-neutral');
      const label = t.tono === 'buena' ? '▲ buena' : (t.tono === 'mala' ? '▼ mala' : '● normal');
      sentBadge = ` <span class="mono ${cls}" style="font-size:10px;">${label}</span>`;
    }
    const headlineText = t && t.es ? t.es : item.headline;
    return `
      <a class="news-item" href="${escapeHTML(item.url || '#')}" target="_blank" rel="noopener">
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span class="mono" style="font-size:10.5px; color:var(--amber); text-transform:uppercase;">${escapeHTML(item.source || 'Finnhub')}</span>
          <span class="dim" style="font-size:10.5px;">${timeAgo(item.datetime)}</span>
        </div>
        <div style="font-size:13px; line-height:1.4;">${escapeHTML(headlineText)}${sentBadge}</div>
      </a>
    `;
  }).join('');

  box.innerHTML = topRow + itemsHtml;
}
