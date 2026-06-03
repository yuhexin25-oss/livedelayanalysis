import { useEffect, useState, useMemo } from 'react';
import WelcomePage from './components/WelcomePage.jsx';
import MapView from './components/MapView.jsx';
import TopDelays from './components/TopDelays.jsx';
import HubImpact from './components/HubImpact.jsx';
import NetworkView from './components/NetworkView.jsx';
import AirportDetail from './components/AirportDetail.jsx';

const refreshIntervalMs = 90 * 1000;

function App() {
  const [data, setData] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchStatus() {
      try {
        const response = await fetch('/api/status');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || response.statusText);
        if (mounted) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Unable to load airport status');
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshIntervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const topDelayed = useMemo(() => {
    if (!data?.hubs) return [];
    return [...data.hubs]
      .filter(hub => hub.delayMinutes > 0 || hub.isDisrupted)
      .sort((a, b) => b.delayMinutes - a.delayMinutes || b.hubImpactScore - a.hubImpactScore)
      .slice(0, 6);
  }, [data]);

  const explanation = data
    ? `Live FAA airport status source: ${data.source}. Static route network data stored locally. Estimated hub impact scores are computed from delay minutes, affected airport counts, and hub connectivity.`
    : 'Loading live FAA airport status and static route network data...';

  return (
    <div className="app-shell">
      <header className="app-banner">
        <div>
          <span className="eyebrow">Hub Resilience Monitor</span>
          <h1>U.S. Airport Delay & Hub Disruption Dashboard</h1>
          <p>{explanation}</p>
        </div>
      </header>
      <main>
        <WelcomePage />
        {error && <div className="alert">Live data error: {error}. Showing fallback sample data if available.</div>}
        <section className="dashboard-grid">
          <div className="card wide-card">
            <MapView airports={data?.allAirports || []} hubs={data?.hubs || []} onSelect={setSelectedAirport} />
          </div>
          <div className="card side-card">
            <HubImpact hubs={data?.hubs || []} />
          </div>
        </section>
        <section className="dashboard-grid">
          <div className="card small-card">
            <TopDelays topDelayed={topDelayed} onSelect={setSelectedAirport} />
          </div>
          <div className="card small-card">
            <NetworkView hubs={data?.hubs || []} routes={data?.routes || []} onSelect={setSelectedAirport} />
          </div>
          <div className="card small-card">
            <AirportDetail airport={selectedAirport} />
          </div>
        </section>
      </main>
      <footer className="app-footer">
        <p>Note: FAA data shows live airport operational status, not every individual flight. Hub impact score is an estimate and uses static route connectivity plus FAA status signals.</p>
      </footer>
    </div>
  );
}

export default App;
