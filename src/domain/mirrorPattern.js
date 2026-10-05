// Nine nodes, row-major. Crossing an unvisited midpoint selects it as on Android.
export function appendPatternNode(path, node) {
  if (!Number.isInteger(node) || node < 0 || node > 8 || path.includes(node)) return path;
  const last = path[path.length - 1];
  if (last === undefined) return [node];
  const dx = node % 3 - last % 3;
  const dy = Math.floor(node / 3) - Math.floor(last / 3);
  const midpoint = (last + node) / 2;
  const crosses = (Math.abs(dx) === 2 && dy === 0) || (dx === 0 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 2);
  return crosses && !path.includes(midpoint) ? [...path, midpoint, node] : [...path, node];
}

export const validPattern = (path) => Array.isArray(path) && path.length >= 4 && path.length <= 9 && new Set(path).size === path.length && path.every(node => Number.isInteger(node) && node >= 0 && node <= 8);
export const samePattern = (a, b) => a.length === b.length && a.every((node, index) => node === b[index]);
