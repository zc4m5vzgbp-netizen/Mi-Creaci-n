// Motor Estadístico — funciones de inferencia estadística reutilizables.
//
// Intervalo de Wilson (95%): método estándar para estimar el rango de
// incertidumbre de una proporción observada (éxitos/total). Se eligió sobre
// el intervalo normal clásico porque se mantiene confiable incluso con
// muestras pequeñas o medianas (decenas a cientos de observaciones, que es
// justo nuestro caso), y no requiere asumir ninguna distribución previa
// (a diferencia de un enfoque Bayesiano, que sería válido pero añade
// complejidad que no se justifica a esta escala).

export function computeWilsonInterval(successes, total) {
  if (
    total == null || successes == null ||
    !Number.isFinite(total) || !Number.isFinite(successes) ||
    total <= 0 || successes < 0 || successes > total
  ) {
    return null;
  }

  const z = 1.96; // z-score para 95% de confianza
  const n = total;
  const p = successes / n;

  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));

  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);

  return {
    proportion: p,
    lower,
    upper,
    confidenceLevel: 0.95,
    sampleSize: n,
  };
}
