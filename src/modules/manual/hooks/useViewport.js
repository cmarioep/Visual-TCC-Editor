import { useState, useCallback } from 'react';

export function useViewport() {
  const [xRange, setXRange] = useState(null);
  const [yRange, setYRange] = useState(null);

  const reset = useCallback(() => {
    setXRange(null);
    setYRange(null);
  }, []);

  return {
    xRange,
    yRange,
    setXRange,
    setYRange,
    reset,
    hasZoom: !!(xRange || yRange),
  };
}
