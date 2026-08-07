import { API_BASE, INDEX_SYMBOLS, DEFAULT_FINNHUB_KEY } from './constants.js';
import { state, applySection, toggleSection } from './state.js';
import { safeSetItem } from './utils/storage.js';
import { sleep, fetchWithRetry } from './utils/dom.js';
import { escapeHTML } from './utils/format.js';
import { fetchSymbol } from './services/finnhub.js';
import { fetchIndicators } from './services/alphaVantage.js';
import { maybeFetchExtraNews } from './services/newsService.js';
import { maybeFetchMacroData } from './services/macroData.js';
import { fetchGEX } from './services/optionsEngine.js';
import { renderRiskCard, calculateRiskResults } from './ui/riskCard.js';
import { fetchAIAnalysis, translateNews } from './services/aiProxy.js';
import { renderQuote, shareSymbol } from './ui/quoteCard.js';
import { renderIndicators } from './ui/indicatorsCard.js';
import { renderAIAnalysis } from './ui/aiCard.js';
import { renderChartWidget, renderNewsWidget } from './ui/newsCards.js';
import { renderWatchlist, renderTicker } from './ui/watchlist.js';
import { renderFundamentalCard } from './ui/fundamentalCard.js';
import { renderOptionsCard } from './ui/optionsCard.js';

function toggleWatch(symbol) {
  const has = state.watchlist.includes(symbol);
  state.watchlist = has ? state.watchlist.filter(s => s !== symbol) : state.watchlist.concat([symbol]);
  safeSetItem('watchlist', JSON.stringify(state.watchlist));
  if (!has && !state.cache[symbol]) fetchSymbol(symbol);
  else { renderWatchlist(); renderQuote(); }
}

function selectSymbol(symbol) {
  state.selected = symbol;
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').style.display = 'none';
  if (!state.cache[symbol] || state.cache[symbol].error) fetchSymbol(symbol);
  else { renderQuote(); renderWatchlist(); }
  renderIndicators();
  renderChartWidget();
  renderNewsWidget();
  maybeFetchExtraNews(symbol);
  renderAIAnalysis();
  renderFundamentalCard();
  renderOptionsCard();
  renderRiskCard();
}

async function scanWatchlist() {
  if (!state.avKey) {
    document.getElementById('scanStatus').textContent = 'Agrega tu clave de Alpha Vantage en ⚙ primero.';
    return;
  }
  const btn = document.getElementById('scanBtn');
  const status = document.getElementById('scanStatus');
  btn.disabled = true;
  const today = new Date().toISOString().slice(0, 10);
  const symbols = state.watchlist;
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const cached = state.indicatorsCache[sym];
    const needsFetch = !cached || cached.fetchedDate !== today || cached.error;
    if (needsFetch) {
      status.textContent = `Consultando ${sym} (${i + 1}/${symbols.length})…`;
      await fetchIndicators(sym);
      if (i < symbols.length - 1) {
        status.textContent = 'Esperando por el límite gratis de consultas por minuto…';
        await sleep(13000);
      }
    }
  }
  status.textContent = symbols.length ? 'Listo.' : '';
  btn.disabled = false;
  renderWatchlist();
}

function showMain() {
  document.getElementById('settingsPanel').style.display = 'none';
  document.getElementById('mainPanel').style.display = 'block';
  document.getElementById('gearBtn').style.display = 'inline-block';
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.bottom-tab-btn').forEach((b) => b.classList.remove('active'));
  const panel = document.getElementById('tab-' + tabId);
  const btn = document.getElementById('tabbtn-' + tabId);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
  window.scrollTo(0, 0);
}

function startAutoRefresh() {
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!state.apiKey) return;
    Array.from(new Set(INDEX_SYMBOLS.concat([state.selected], state.watchlist))).forEach(fetchSymbol);
  }, 60000);
}

let searchTimer = null;
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.trim();
  clearTimeout(searchTimer);
  const resultsBox = document.getElementById('searchResults');
  if (!q) { resultsBox.style.display = 'none'; return; }
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/search?q=${encodeURIComponent(q)}&token=${state.apiKey}`, 1);
      const data = await res.json();
      const results = (data.result || []).slice(0, 6);
      if (results.length === 0) { resultsBox.style.display = 'none'; return; }
      resultsBox.innerHTML = results.map(r => `<button class="search-result-item" onclick="selectSymbol('${r.symbol}')"><span class="mono" style="font-weight:600; margin-right:8px;">${escapeHTML(r.symbol)}</span><span class="dim" style="font-size:12.5px;">${escapeHTML(r.description)}</span></button>`).join('');
      resultsBox.style.display = 'block';
    } catch (e) { resultsBox.style.display = 'none'; }
  }, 400);
});

document.getElementById('saveKeyBtn').addEventListener('click', async () => {
  const input = document.getElementById('keyInput');
  const avInput = document.getElementById('avKeyInput');
  const aiInput = document.getElementById('aiUrlInput');
  const aiPassInput = document.getElementById('aiPasswordInput');
  const errBox = document.getElementById('keyError');
  const trimmed = input.value.trim() || DEFAULT_FINNHUB_KEY;
  const avTrimmed = avInput.value.trim();
  const aiTrimmed = aiInput.value.trim();
  const aiPassTrimmed = aiPassInput.value.trim();
  errBox.style.display = 'none';
  const btn = document.getElementById('saveKeyBtn');
  btn.textContent = 'Conectando…'; btn.disabled = true;
  try {
    const res = await fetchWithRetry(`${API_BASE}/quote?symbol=AAPL&token=${trimmed}`);
    const data = await res.json();
    if (!res.ok || data.error || (data.c === 0 && data.pc === 0)) throw new Error('Esa clave de Finnhub no funcionó. Revisa que la copiaste completa, sin espacios.');
    state.apiKey = trimmed;
    safeSetItem('finnhub_api_key', trimmed);
    if (avTrimmed) { state.avKey = avTrimmed; safeSetItem('alphavantage_api_key', avTrimmed); }
    if (aiTrimmed) { state.aiProxyUrl = aiTrimmed; safeSetItem('ai_proxy_url', aiTrimmed); }
    if (aiPassTrimmed) { state.aiProxyPassword = aiPassTrimmed; safeSetItem('ai_proxy_password', aiPassTrimmed); }
    showMain();
    Array.from(new Set(INDEX_SYMBOLS.concat([state.selected], state.watchlist))).forEach(fetchSymbol);
    renderIndicators();
    renderChartWidget();
    renderNewsWidget();
    maybeFetchExtraNews(state.selected);
    renderAIAnalysis();
    renderFundamentalCard();
    maybeFetchMacroData();
  } catch (e) {
    errBox.textContent = e.message || 'No se pudo conectar. Revisa tu clave.';
    errBox.style.display = 'block';
  } finally {
    btn.textContent = 'Guardar y conectar'; btn.disabled = false;
  }
});

document.getElementById('gearBtn').addEventListener('click', () => {
  document.getElementById('keyInput').value = state.apiKey || '';
  document.getElementById('avKeyInput').value = state.avKey || '';
  document.getElementById('aiUrlInput').value = state.aiProxyUrl || '';
  document.getElementById('aiPasswordInput').value = state.aiProxyPassword || '';
  document.getElementById('settingsTitle').textContent = 'Actualizar tus claves';
  document.getElementById('cancelSettingsBtn').style.display = 'inline-block';
  document.getElementById('settingsPanel').style.display = 'block';
  document.getElementById('mainPanel').style.display = 'none';
});
document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
  document.getElementById('settingsPanel').style.display = 'none';
  showMain();
});

// Los onclick="..." del HTML generado llaman estas funciones por nombre global.
// Un módulo ES no las expone solo — hay que asignarlas a window explícitamente.
window.toggleSection = toggleSection;
window.toggleWatch = toggleWatch;
window.selectSymbol = selectSymbol;
window.shareSymbol = shareSymbol;
window.fetchSymbol = fetchSymbol;
window.fetchIndicators = fetchIndicators;
window.scanWatchlist = scanWatchlist;
window.translateNews = translateNews;
window.fetchAIAnalysis = fetchAIAnalysis;
window.fetchGEX = fetchGEX;
window.calculateRisk = calculateRiskResults;
window.switchTab = switchTab;

showMain();
applySection('tvNews');
applySection('fhNews');
Array.from(new Set(INDEX_SYMBOLS.concat([state.selected], state.watchlist))).forEach(fetchSymbol);
renderIndicators();
renderWatchlist();
renderChartWidget();
renderNewsWidget();
maybeFetchExtraNews(state.selected);
renderAIAnalysis();
renderFundamentalCard();
maybeFetchMacroData();
renderOptionsCard();
renderRiskCard();
startAutoRefresh();
