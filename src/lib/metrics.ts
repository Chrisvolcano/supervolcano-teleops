export function computeRoleSplit(metrics?: {
  robotActiveSec?: number;
  humanActiveSec?: number;
}) {
  const robot = Math.max(0, Math.floor(metrics?.robotActiveSec ?? 0));
  const human = Math.max(0, Math.floor(metrics?.humanActiveSec ?? 0));
  const total = robot + human;
  if (total === 0) {
    return {
      robotPercent: 0,
      humanPercent: 0,
    };
  }
  return {
    robotPercent: Number(((robot / total) * 100).toFixed(1)),
    humanPercent: Number(((human / total) * 100).toFixed(1)),
  };
}
