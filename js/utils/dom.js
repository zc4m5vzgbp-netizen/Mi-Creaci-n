export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchWithRetry(url, attempts) {
  attempts = attempts || 2;
  let lastErr;
  for (let i = 0; i <= attempts; i++) {
    try { return await fetch(url); }
    catch (e) { lastErr = e; if (i < attempts) await sleep(1200 * (i + 1)); }
  }
  throw lastErr;
}

export function extractJSONArray(text) {
  let cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}

