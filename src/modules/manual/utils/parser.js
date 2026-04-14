/**
 * Parses two-column numeric text (tab, space, comma, or semicolon separated).
 * Header rows are skipped automatically — any row that doesn't yield two valid
 * numbers is ignored, so pasting directly from Excel works with or without headers.
 *
 * Returns { ok: true, data: Point[] } | { ok: false, error: string }
 */
export function parseInput(text) {
  const data = text
    .trim()
    .split(/\n/)
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const nums = l.split(/[\t,; ]+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
      return nums.length >= 2 ? { x: nums[0], y: nums[1] } : null;
    })
    .filter(Boolean);

  if (data.length >= 2) return { ok: true, data };
  return { ok: false, error: 'No se encontraron datos. Pega dos columnas numéricas (X e Y).' };
}
