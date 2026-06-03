export default function TopDelays({ topDelayed, onSelect }) {
  return (
    <div>
      <div className="section-heading">
        <div>
          <span className="section-kicker">Current advisories</span>
          <h2>Top Delayed Airports</h2>
        </div>
      </div>
      {topDelayed.length === 0 ? (
        <p className="no-data">No active delay advisories are visible for monitored airports.</p>
      ) : (
        <div className="delay-list">
          {topDelayed.map((airport, index) => (
            <button key={airport.iata} className="delay-row" onClick={() => onSelect(airport)}>
              <span className="rank">{String(index + 1).padStart(2, '0')}</span>
              <span className={`status-dot dot-${airport.severity}`} />
              <span className="airport-name"><strong>{airport.iata}</strong><small>{airport.disruptionType}</small></span>
              <span className="delay-value">{airport.delayMinutes || '—'}<small>min</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
