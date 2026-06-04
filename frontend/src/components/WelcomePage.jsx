export default function WelcomePage({ sourceMode, onOpenDashboard, onViewMethodology, onExploreNetwork }) {
  const isLive = sourceMode === 'live';

  return (
    <section className="welcome-landing">
      <span className="section-kicker">GIS / aviation analytics portfolio project</span>
      <h1>Hub Resilience Monitor</h1>
      <h2>Real-Time Airport and Flight Delay Risk Platform</h2>
      <p>
        This platform combines {isLive ? 'live backend airport status data' : 'sample operational delay scenarios'},
        operational delay metrics, static route network data, and estimated network impact scoring to explore delay
        propagation, hub vulnerability, and airport network resilience.
      </p>
      <div className="provenance-row">
        <span><i className={`provenance-dot ${isLive ? 'live-dot' : 'estimate-dot'}`} />{isLive ? 'Live backend data' : 'Sample operational data'}</span>
        <span><i className="provenance-dot static-dot" />Static route network</span>
        <span><i className="provenance-dot estimate-dot" />Estimated risk scoring</span>
      </div>
      <div className="welcome-actions">
        <button type="button" onClick={onOpenDashboard}>Open Live Dashboard</button>
        <button type="button" onClick={onViewMethodology}>View Methodology</button>
        <button type="button" onClick={onExploreNetwork}>Explore Airport Network</button>
      </div>
      <p className="honesty-note">
        FAA advisories are supplemental context. This is an operational risk analytics tool, not an exact flight-delay prediction system.
      </p>
    </section>
  );
}
