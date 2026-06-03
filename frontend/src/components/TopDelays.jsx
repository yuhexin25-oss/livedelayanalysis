export default function TopDelays({ topDelayed, onSelect }) {
  return (
    <div>
      <h2 className="section-title">Top Delayed Hubs</h2>
      {topDelayed.length === 0 ? (
        <p className="no-data">No delayed hubs are currently visible.</p>
      ) : (
        <ul className="simple-list">
          {topDelayed.map(hub => (
            <li key={hub.iata}>
              <button className="link-button" onClick={() => onSelect(hub)}>
                <strong>{hub.iata}</strong> — {hub.name}
              </button>
              <div className="detail-row">
                <span>Delay</span><span>{hub.delayMinutes} min</span>
              </div>
              <div className="detail-row">
                <span>Type</span><span>{hub.disruptionType}</span>
              </div>
              <div className="detail-row">
                <span>Impact</span><span>{hub.hubImpactScore}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
