import { InputSection } from './InputSection';
import { StatsSection } from './StatsSection';
import { SelectionsSection } from './SelectionsSection';
import { ExportSection } from './ExportSection';

export function Panel({
  // input
  inputText, parseError, onInputChange, onParse, onApplyPoints,
  // stats
  nRaw, nOut, nGap,
  // selections
  selections, rawPts, onRemoveSelection, onLambdaChange,
  // export
  curveName, onCurveNameChange, onCopyJSON, onExportTXT, copied, downloadMsg,
}) {
  return (
    <aside className="panel">
      <InputSection
        inputText={inputText}
        parseError={parseError}
        onChange={onInputChange}
        onParse={onParse}
        rawPts={rawPts}
        onApplyPoints={onApplyPoints}
      />
      <StatsSection nRaw={nRaw} nOut={nOut} nGap={nGap} />
      <SelectionsSection
        selections={selections}
        rawPts={rawPts}
        onRemove={onRemoveSelection}
        onLambdaChange={onLambdaChange}
        nGap={nGap}
      />
      <ExportSection
        curveName={curveName}
        onNameChange={onCurveNameChange}
        onCopyJSON={onCopyJSON}
        onExportTXT={onExportTXT}
        copied={copied}
        downloadMsg={downloadMsg}
      />
    </aside>
  );
}
