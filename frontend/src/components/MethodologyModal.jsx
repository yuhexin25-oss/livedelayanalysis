export default function MethodologyModal({ refreshIntervalMinutes, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="methodology-modal" role="dialog" aria-modal="true" aria-labelledby="methodology-title" onClick={event => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close methodology">×</button>
        <span className="section-kicker">Methodology</span>
        <h2 id="methodology-title">How The Platform Estimates Operational Delay Risk</h2>
        <div className="methodology-grid">
          <div>
            <h3>Data Sources</h3>
            <p>Operational flight-delay metrics are combined with static local route network data. FAA advisories are supplemental context.</p>
          </div>
          <div>
            <h3>Update Frequency</h3>
            <p>The backend refreshes airport operational data every {refreshIntervalMinutes} minutes.</p>
          </div>
          <div>
            <h3>Hub Impact Score</h3>
            <p className="formula">
              Hub Impact Score = Departure Delay × 0.4 + Arrival Delay × 0.2 + Cancellation Rate × 200 + Connectivity × 0.8 + Ground Stop Bonus
            </p>
          </div>
          <div>
            <h3>Important Caveats</h3>
            <p>
              The score is an estimated analytical metric, not an official FAA metric. Raw FAA advisory text is not
              used as the primary airport-closure signal.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
