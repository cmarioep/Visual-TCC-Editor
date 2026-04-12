/**
 * Parámetros magnéticos por tipo de curva IEC 60898-1
 * La parte térmica (p1, p2, p3) es igual para todos los tipos.
 * Solo varía el umbral magnético (knee / magUpper).
 */
export const CURVE_PARAMS = {
  B: { knee: 3.0,  magUpper: 5,  magDefault: 4,  label: 'Tipo B', desc: 'Cargas resistivas' },
  C: { knee: 5.0,  magUpper: 10, magDefault: 7,  label: 'Tipo C', desc: 'Cargas mixtas'     },
  D: { knee: 10.0, magUpper: 20, magDefault: 14, label: 'Tipo D', desc: 'Cargas inductivas' },
}
