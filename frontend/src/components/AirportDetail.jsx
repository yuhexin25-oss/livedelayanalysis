export default function AirportDetail({ airport }) {
  if (!airport) {
    return (
      <div>
        <h2 className="section-title">Airport Detail</h2>
        <p className="no-data">Click a hub on the map or in the list to inspect the airport impact panel.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">Airport Detail</h2>
      <div className="detail-row"><strong>Airport</strong><span>{airport.name}</span></div>
      <div className="detail-row"><strong>Code</strong><span>{airport.iata}</span></div>
      <div className="detail-row"><strong>Status</strong><span>{airport.status}</span></div>
      <div className="detail-row"><strong>Disruption</strong><span>{airport.disruptionType}</span></div>
      <div className="detail-row"><strong>Delay</strong><span>{airport.delayMinutes} min</span></div>
      <div className="detail-row"><strong>Connected airports</strong><span>{airport.affectedAirportsCount}</span></div>
      <div className="detail-row"><strong>Connectivity</strong><span>{airport.hubConnectivityScore}</span></div>
      <div className="detail-row"><strong>Impact score</strong><span>{airport.hubImpactScore}</span></div>
      <div className="detail-row"><strong>Severity</strong><span>{airport.severity}</span></div>
      <p style={{ marginTop: '14px', color: '#9fb4d1' }}>
        Note: the airport detail panel reflects estimated hub impact and live FAA operational status signals.
      </p>
    </div>
  );
}
