import { safeParseJSON } from './utils/storage.js';
import { DEFAULT_FINNHUB_KEY } from './constants.js';

export const sectionState = {
  tvNews: true, fhNews: true,
  'sec-quote': true, 'sec-chart': true, 'sec-watchlist': true, 'sec-performance': true,
  'sec-indicators': true, 'sec-advind': true, 'sec-math': true, 'sec-prob': true,
  'sec-smartmoney': true, 'sec-volume': true, 'sec-priceaction': true, 'sec-pricechart': true,
  'sec-fundamental': true, 'sec-options': true, 'sec-risk': true,
  'sec-sentiment': true, 'sec-central': true, 'sec-ai': true,
};

export function toggleSection(id) {
  sectionState[id] = !sectionState[id];
  applySection(id);
}

export function applySection(id) {
  const body = document.getElementById(id + '-body');
  const chevron = document.getElementById(id + '-chevron');
  if (!body) return;
  const open = !!sectionState[id];
  body.classList.toggle('open', open);
  if (chevron) chevron.classList.toggle('open', open);
}

export const state = {
  apiKey: localStorage.getItem('finnhub_api_key') || DEFAULT_FINNHUB_KEY,
  avKey: localStorage.getItem('alphavantage_api_key') || null,
  aiProxyUrl: localStorage.getItem('ai_proxy_url') || null,
  aiProxyPassword: localStorage.getItem('ai_proxy_password') || null,
  watchlist: safeParseJSON(localStorage.getItem('watchlist'), ['AAPL', 'TSLA', 'NVDA']),
  selected: 'AAPL',
  cache: {},
  indicatorsCache: safeParseJSON(localStorage.getItem('indicators_cache'), {}),
  newsCache: {},
  macroCache: safeParseJSON(localStorage.getItem('macro_cache'), null),
  gexCache: safeParseJSON(localStorage.getItem('gex_cache'), {}),
  riskCapital: safeParseJSON(localStorage.getItem('risk_capital'), null),
  riskPct: safeParseJSON(localStorage.getItem('risk_pct'), 1),
  perfPeriod: '1M',
  perfPeriod: '1M',
};
