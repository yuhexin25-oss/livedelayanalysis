export default function WelcomePage() {
  return (
    <section className="welcome-card">
      <div>
        <span className="section-kicker">Welcome</span>
        <h2>See where a hub disruption could travel next.</h2>
      </div>
      <p>
        Hub Resilience Monitor combines live FAA airport advisories with a static local route network to estimate
        operational ripple effects across major U.S. hubs. It is an airport-level awareness tool, not a flight tracker.
      </p>
      <div className="provenance-row">
        <span><i className="provenance-dot live-dot" />Live FAA status</span>
        <span><i className="provenance-dot static-dot" />Static route network</span>
        <span><i className="provenance-dot estimate-dot" />Estimated impact score</span>
      </div>
    </section>
  );
}
