export default function WelcomePage() {
  return (
    <section className="card">
      <h2 className="section-title">Welcome</h2>
      <p>Hub Resilience Monitor is a live U.S. airport delay and hub disruption dashboard built for situational awareness.</p>
      <p>It combines FAA live airport status signals with static route network data to estimate how major hub disruptions can ripple through connected airports.</p>
      <p>Major hub airports included are ATL, ORD, DFW, DEN, LAX, JFK, EWR, SFO, SEA, CLT, PHX, IAH, LAS, and MIA.</p>
      <p>This dashboard is designed as an operational support tool, showing airport-level status and estimated impact, not flight-level tracking.</p>
    </section>
  );
}
