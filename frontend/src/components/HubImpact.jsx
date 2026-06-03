export default function HubImpact({ hubs, sourceMode, onSelect }) {
  const ranked = [...hubs].sort((a, b) => b.hubImpactScore - a.hubImpactScore);
  const disrupted = ranked.filter(hub => hub.isDisrupted);
  const maxScore = Math.max(...ranked.map(hub => hub.hubImpactScore), 1);

  return (
    <div>
      <div className="section-heading">
        <div>
          <span className="section-kicker">Estimated network effect</span>
          <h2>Hub Impact Score</h2>
        </div>
        <span className="count-badge">{disrupted.length} disrupted</span>
      </div>
      <p className="section-note">Delay minutes × 0.5 + affected airports × 2 + connectivity × 0.3</p>
      <div className="impact-list">
        {ranked.slice(0, 8).map(hub => (
          <button className="impact-row" key={hub.iata} onClick={() => onSelect(hub)}>
            <span className={`status-dot dot-${hub.severity}`} />
            <strong>{hub.iata}</strong>
            <span className="impact-track"><i style={{ width: `${(hub.hubImpactScore / maxScore) * 100}%` }} /></span>
            <span>{hub.hubImpactScore.toFixed(1)}</span>
          </button>
        ))}
      </div>
      <p className="panel-footnote">
        Scores are estimates based on {sourceMode === 'live' ? 'live FAA signals' : 'sample status data'} and static local route connectivity.
      </p>
    </div>
  );
}
