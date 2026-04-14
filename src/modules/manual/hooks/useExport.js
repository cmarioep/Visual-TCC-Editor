import { useState, useCallback } from 'react';

function buildOutputText(outputPts, curveName) {
  const PER_ROW = 4;
  const indent = '            ';
  const rows = [];
  for (let i = 0; i < outputPts.length; i += PER_ROW) {
    const chunk = outputPts.slice(i, i + PER_ROW);
    rows.push(indent + chunk.map(p => `{ x: ${p.x}, y: ${p.y} }`).join(', ') + ',');
  }
  if (rows.length) rows[rows.length - 1] = rows[rows.length - 1].replace(/,$/, '');
  return [
    '{',
    `  name: "${curveName || 'curve'}",`,
    '  points: [',
    ...rows,
    '  ]',
    '}',
  ].join('\n');
}

export function useExport(output, curveName) {
  const [copied, setCopied] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState(null);

  const copyJSON = useCallback(() => {
    if (!output) return;
    const text = buildOutputText(output.outputPts, curveName);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }, [output, curveName]);

  const exportTXT = useCallback(() => {
    if (!output) return;
    const text = buildOutputText(output.outputPts, curveName);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (curveName || 'curve') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMsg('Descargado');
    setTimeout(() => setDownloadMsg(null), 2200);
  }, [output, curveName]);

  return { copied, downloadMsg, copyJSON, exportTXT };
}
