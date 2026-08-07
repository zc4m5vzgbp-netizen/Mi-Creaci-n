// Motor de Gestión de Riesgo — matemática pura sobre los números que el usuario
// ingresa. No sugiere cuánto arriesgar, ni qué acción operar; solo calcula.

export function computePositionSize(capital, riskPct, entryPrice, stopPrice) {
  if (!capital || !riskPct || !entryPrice || !stopPrice) return null;
  const riskPerShare = Math.abs(entryPrice - stopPrice);
  if (riskPerShare === 0) return null;
  const dollarRisk = capital * (riskPct / 100);
  const shares = Math.floor(dollarRisk / riskPerShare);
  const positionCost = shares * entryPrice;
  return { dollarRisk, riskPerShare, shares, positionCost };
}

export function computeRiskReward(entryPrice, stopPrice, targetPrice) {
  if (!entryPrice || !stopPrice || !targetPrice) return null;
  const risk = Math.abs(entryPrice - stopPrice);
  const reward = Math.abs(targetPrice - entryPrice);
  if (risk === 0) return null;
  return { risk, reward, ratio: reward / risk };
}
