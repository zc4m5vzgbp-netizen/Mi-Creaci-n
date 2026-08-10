// Componente de tooltip ⓘ — completamente independiente de los datos.
// Solo genera HTML estático a partir del texto que cada tarjeta le pase.
// No lee precios, no lee indicadores, no llama motores ni APIs.

export function tipIcon(id) {
  return `<button class="tip-icon" onclick="toggleTooltip('${id}')" aria-label="Más información">ⓘ</button>`;
}

export function tipBody(id, html) {
  return `<div id="${id}-body" class="tip-body"><div class="tip-content">${html}</div></div>`;
}
