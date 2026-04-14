export function StatsSection({ nRaw, nOut, nGap }) {
  return (
    <section className="panel__section">
      <h2 className="panel__section-title">Statistics</h2>
      <div className="stats">
        <StatCard label="Raw" value={nRaw} />
        <StatCard label="Output" value={nOut} />
        <StatCard label="Gap" value={nGap} />
      </div>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stats__card">
      <div className="stats__card-label">{label}</div>
      <div className="stats__card-value">{value}</div>
    </div>
  );
}
