function formatTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AirportDetail({ airport, sourceMode, faaUpdatedAt }) {
  if (!airport) {
    return (
      <div>
        <span className="section-kicker">Inspection</span>
        <h2>Airport Detail</h2>
        <p className="no-data">Select an airport on the map or in a ranking to inspect its operational status.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="detail-header">
        <div>
          <span className="section-kicker">{airport.isHub ? 'Major hub airport' : 'Monitored airport'}</span>
          <h2>{airport.iata}</h2>
          <p>{airport.name}</p>
        </div>
        <span className={`severity-pill severity-${airport.severity}`}>{airport.disruptionType}</span>
      </div>
      <div className="detail-grid">
        <div><span>Reported delay</span><strong>{airport.delayMinutes || 0} min</strong></div>
        <div><span>Impact score</span><strong>{airport.hubImpactScore ?? 'N/A'}</strong></div>
        <div><span>Connected airports</span><strong>{airport.connectedAirports?.length ?? airport.hubConnectivityScore ?? 'N/A'}</strong></div>
        <div><span>Major hub</span><strong>{airport.isHub ? 'Yes' : 'No'}</strong></div>
        <div><span>Severity level</span><strong>{airport.severity}</strong></div>
        <div><span>FAA update</span><strong>{formatTime(faaUpdatedAt)}</strong></div>
      </div>
      <div className="advisory-box">
        <span>{sourceMode === 'live' ? 'FAA airport status advisory' : 'Sample airport status advisory'}</span>
        <p>{airport.status}</p>
        <small>Disruption type: {airport.disruptionType}</small>
        {airport.trend && <small>Trend: {airport.trend}</small>}
      </div>
      <p className="panel-footnote">This is airport-level operational status, not the status of every flight.</p>
    </div>
  );
}
