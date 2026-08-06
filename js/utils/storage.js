export function safeParseJSON(str, fallback) {
  if (str === null || str === undefined) return fallback;
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

export function safeSetItem(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { console.error('No se pudo guardar', key, e); }
}
