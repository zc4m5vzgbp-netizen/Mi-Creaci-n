export function gaugeSVG(score, maxTotal, verdictClass) {
  const pct = maxTotal > 0 ? Math.max(0, Math.min(1, score / maxTotal)) : 0;
  const cx = 100, cy = 96, r = 76, strokeW = 16;
  function pt(radius, p) {
    const angleRad = (180 - p * 180) * Math.PI / 180;
    return { x: cx + radius * Math.cos(angleRad), y: cy - radius * Math.sin(angleRad) };
  }
  function arcPath(p0, p1, radius) {
    const s = pt(radius, p0), e = pt(radius, p1);
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }
  const needleColor = verdictClass === 'tag-good' ? 'var(--gain)' : (verdictClass === 'tag-bad' ? 'var(--loss)' : 'var(--paper)');
  const tip = pt(r - 22, pct);
  return `
    <svg width="100%" height="118" viewBox="0 0 200 112" style="display:block; overflow:visible;">
      <path d="${arcPath(0, 0.4, r)}" style="stroke:var(--loss); stroke-width:${strokeW}; fill:none; stroke-linecap:round; opacity:0.85;"/>
      <path d="${arcPath(0.4, 0.7, r)}" style="stroke:var(--amber); stroke-width:${strokeW}; fill:none; stroke-linecap:round; opacity:0.85;"/>
      <path d="${arcPath(0.7, 1, r)}" style="stroke:var(--gain); stroke-width:${strokeW}; fill:none; stroke-linecap:round; opacity:0.85;"/>
      <line x1="${cx}" y1="${cy}" x2="${tip.x.toFixed(2)}" y2="${tip.y.toFixed(2)}" style="stroke:${needleColor}; stroke-width:3; stroke-linecap:round;"/>
      <circle cx="${cx}" cy="${cy}" r="6" style="fill:${needleColor};"/>
    </svg>
  `;
}

