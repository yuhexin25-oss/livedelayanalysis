export default function WelcomePage({ sourceMode }) {
  const isLive = sourceMode === 'live';

  return (
    <section className="welcome-card">
      <div>
        <span className="section-kicker">Research framing</span>
        <h2>How does a disruption at a major hub ripple through the U.S. air transportation network?</h2>
      </div>
      <p>
        This dashboard estimates how delays at hub airports may propagate through connected airports using
        {isLive ? ' FAA operational advisories' : ' sample airport status scenarios'} and route network connectivity.
        It is an airport-level awareness and analytics tool, not a flight tracker.
      </p>
      <div className="provenance-row">
        <span><i className={`provenance-dot ${isLive ? 'live-dot' : 'estimate-dot'}`} />{isLive ? 'Live FAA status' : 'Sample status data'}</span>
        <span><i className="provenance-dot static-dot" />Static route network</span>
        <span><i className="provenance-dot estimate-dot" />Estimated impact score</span>
      </div>
    </section>
  );
}
