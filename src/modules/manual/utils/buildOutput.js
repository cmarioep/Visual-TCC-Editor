import { smoothingSpline } from './spline';
import { toLogLog, toLinear } from './coords';

/**
 * For each selection box, gather the raw points inside it and smooth them
 * in log-log space. Points not covered by any selection become "gap points"
 * and are passed through unmodified.
 *
 * @param {Point[]} rawPts
 * @param {Selection[]} selections  [{xMin,xMax,yMin,yMax,lambda,id}]
 * @returns {{ segRaw, smoothedSegs, gapPts, outputPts } | null}
 */
export function buildOutput(rawPts, selections) {
  if (!rawPts?.length || !selections.length) return null;

  const sorted = [...rawPts].sort((a, b) => a.x - b.x);

  const segRaw = selections.map(sel =>
    sorted.filter(
      p => p.x >= sel.xMin && p.x <= sel.xMax && p.y >= sel.yMin && p.y <= sel.yMax
    )
  );

  const inAnySelection = new Set();
  segRaw.forEach((seg, si) => {
    const sel = selections[si];
    sorted.forEach((p, pi) => {
      if (p.x >= sel.xMin && p.x <= sel.xMax && p.y >= sel.yMin && p.y <= sel.yMax)
        inAnySelection.add(pi);
    });
  });
  const gapPts = sorted.filter((_, pi) => !inAnySelection.has(pi));

  const smoothedSegs = segRaw.map((seg, si) => {
    if (seg.length < 2) return seg;
    const ll = toLogLog(seg);
    const smoothed = smoothingSpline(ll, selections[si].lambda);
    return toLinear(smoothed);
  });

  const outputPts = [...smoothedSegs.flat(), ...gapPts].sort((a, b) => a.x - b.x);

  return { segRaw, smoothedSegs, gapPts, outputPts };
}
