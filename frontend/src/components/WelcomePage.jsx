export default function WelcomePage({ sourceMode, onOpenDashboard, onViewMethodology, onExploreNetwork }) {
  const isLive = sourceMode === 'live';

  return (
    <section className="welcome-landing">
      <span className="section-kicker">Transportation analytics portfolio project</span>
      <h1>Hub Resilience Monitor</h1>
      <h2>How does a disruption at a major hub ripple through the U.S. air transportation network?</h2>
      <p>
        This dashboard combines {isLive ? 'live FAA airport advisories' : 'sample airport status scenarios'}, static route
        network data, and estimated network impact scoring to explore how airport disruptions may affect the broader
        U.S. aviation system.
      </p>
      <div className="provenance-row">
        <span><i className={`provenance-dot ${isLive ? 'live-dot' : 'estimate-dot'}`} />{isLive ? 'Live FAA status' : 'Sample status data'}</span>
        <span><i className="provenance-dot static-dot" />Static route network</span>
        <span><i className="provenance-dot estimate-dot" />Estimated impact score</span>
      </div>
      <div className="welcome-actions">
        <button type="button" onClick={onOpenDashboard}>Open Live Dashboard</button>
        <button type="button" onClick={onViewMethodology}>View Methodology</button>
        <button type="button" onClick={onExploreNetwork}>Explore Airport Network</button>
      </div>
      <p className="honesty-note">
        This is an airport-level operational awareness and analytics tool, not an individual flight tracker.
      </p>
    </section>
  );
}
