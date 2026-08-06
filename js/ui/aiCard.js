import { state } from '../state.js';

export function renderAIAnalysis() {
  const card = document.getElementById('aiAnalysisCard');
  if (!card) return;
  if (!state.aiProxyUrl) {
    card.innerHTML = `<div class="card-title">Análisis con IA</div><div class="dim" style="font-size:13px; margin-top:10px;">Agrega la URL de tu intermediario de IA en ⚙ para desbloquear esto (opcional).</div>`;
    return;
  }
  card.innerHTML = `<div class="card-title">Análisis con IA — ${state.selected}</div><button class="btn-primary" style="margin-top:12px;" onclick="fetchAIAnalysis('${state.selected}')">Analizar con IA</button><div id="aiAnalysisBox" style="margin-top:12px;"></div>`;
}
