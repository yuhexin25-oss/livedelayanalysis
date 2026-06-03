export default function HubImpact({ hubs }) {
  if (!hubs || hubs.length === 0) {
    return <div className="no-data">Hub impact data is not available yet.</div>;
  }

  const disrupted = hubs.filter(hub => hub.isDisrupted);
  const highest = [...hubs].sort((a, b) => b.hubImpactScore - a.hubImpactScore)[0];
  const averageImpact = Math.round(hubs.reduce((sum, hub) => sum + hub.hubImpactScore, 0) / hubs.length);

  return (
    <div>
      <h2 className="section-title">Hub Impact Score</h2>
      <div className="detail-row">
        <strong>Disrupted hubs</strong><span>{disrupted.length} / {hubs.length}</span>
      </div>
      <div className="detail-row">
        <strong>Highest impact</strong><span>{highest.iata} ({highest.hubImpactScore})</span>
      </div>
      <div className="detail-row">
        <strong>Average score</strong><span>{averageImpact}</span>
      </div>
      <p style={{ marginTop: '18px', color: '#9fb4d1' }}>
        The estimated score uses delay minutes, the number of downstream affected airports, and hub connectivity.
      </p>
    </div>
  );
}
