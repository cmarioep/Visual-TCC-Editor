function relaxJSON(text) {
  return text
    .replace(/\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
}

function extractPoints(parsed) {
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed.points || parsed.data || parsed.mm || parsed.tc
      || parsed.single || Object.values(parsed).find(v => Array.isArray(v));
  if (!arr) return null;
  if (arr[0]?.x !== undefined) return arr;
  if (Array.isArray(arr[0])) return arr.map(r => ({ x: r[0], y: r[1] }));
  return null;
}

/**
 * Parses JSON [{x,y}], wrapped JSON objects, or plain CSV/TSV text.
 * Returns { ok: true, data: Point[] } | { ok: false, error: string }
 */
export function parseInput(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const pts = extractPoints(JSON.parse(trimmed));
      if (pts) return { ok: true, data: pts };
    } catch { /* fall through to relaxed parse */ }
    try {
      const pts = extractPoints(JSON.parse(relaxJSON(trimmed)));
      if (pts) return { ok: true, data: pts };
      return { ok: false, error: 'Parseado pero sin array {x,y} reconocible.' };
    } catch (e) {
      return { ok: false, error: 'JSON/JS inválido: ' + e.message };
    }
  }
  const lines = trimmed
    .split(/\n/)
    .filter(l => l.trim() && !l.startsWith('#') && !l.match(/^[a-z]/i));
  const data = lines
    .map(l => {
      const p = l.split(/[,;\t\s]+/).map(Number).filter(n => !isNaN(n));
      return p.length >= 2 ? { x: p[0], y: p[1] } : null;
    })
    .filter(Boolean);
  if (data.length >= 2) return { ok: true, data };
  return { ok: false, error: 'No se pudo parsear. Usa JSON [{x,y}] o CSV.' };
}
