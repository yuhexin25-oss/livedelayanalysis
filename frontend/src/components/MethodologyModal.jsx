export default function MethodologyModal({ refreshIntervalMinutes, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="methodology-modal" role="dialog" aria-modal="true" aria-labelledby="methodology-title" onClick={event => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close methodology">×</button>
        <span className="section-kicker">Methodology</span>
        <h2 id="methodology-title">How The Dashboard Estimates Hub Disruption Risk</h2>
        <div className="methodology-grid">
          <div>
            <h3>Data Sources</h3>
            <p>Live FAA airport operational status is combined with static local route network data.</p>
          </div>
          <div>
            <h3>Update Frequency</h3>
            <p>The backend refreshes FAA airport status every {refreshIntervalMinutes} minutes.</p>
          </div>
          <div>
            <h3>Hub Impact Score</h3>
            <p className="formula">
              Hub Impact Score = Delay Minutes × 0.5 + Affected Airports × 2 + Connectivity × 0.3
            </p>
          </div>
          <div>
            <h3>Important Caveats</h3>
            <p>
              The score is an estimated analytical metric, not an official FAA metric. This dashboard is an
              airport-level awareness tool, not an individual flight tracker.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
