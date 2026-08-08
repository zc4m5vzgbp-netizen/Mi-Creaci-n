// Rendimiento por período — usa el mismo historial de Alpha Vantage que ya
// tenemos (hasta 400 días). Los períodos se aproximan en días de cotización
// (no días de calendario), ya que así viene organizado el historial.

const PERIOD_DAYS = { '1S': 5, '1M': 21, '3M': 63, '6M': 126, '1A': 252 };
export const PERFORMANCE_PERIODS = Object.keys(PERIOD_DAYS);
export const PERIOD_LABELS = {
  '1S': 'la última semana', '1M': 'el último mes', '3M': 'los últimos 3 meses',
  '6M': 'los últimos 6 meses', '1A': 'el último año',
};

export function computePerformanceForPeriod(closes, periodKey) {
  const days = PERIOD_DAYS[periodKey];
  if (!closes || closes.length < 2 || !days) return null;
  const n = Math.min(days, closes.length - 1);
  const startIdx = closes.length - 1 - n;
  const startPrice = closes[startIdx];
  const endPrice = closes[closes.length - 1];
  if (!startPrice) return null;
  return {
    pct: ((endPrice - startPrice) / startPrice) * 100,
    series: closes.slice(startIdx),
    days: n,
  };
}
