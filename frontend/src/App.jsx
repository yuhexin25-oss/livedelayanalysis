import { useEffect, useMemo, useState } from 'react';
import WelcomePage from './components/WelcomePage.jsx';
import MapView from './components/MapView.jsx';
import TopDelays from './components/TopDelays.jsx';
import HubImpact from './components/HubImpact.jsx';
import NetworkView from './components/NetworkView.jsx';
import AirportDetail from './components/AirportDetail.jsx';

const refreshIntervalMs = 60 * 1000;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function formatTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function App() {
  const [data, setData] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchStatus() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/status`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || response.statusText);
        if (mounted) {
          setData(payload);
          setError(null);
          setSelectedAirport(current => {
            if (!current) return payload.hubs?.find(hub => hub.isDisrupted) || payload.hubs?.[0] || null;
            return payload.hubs?.find(hub => hub.iata === current.iata)
              || payload.allAirports?.find(airport => airport.iata === current.iata)
              || current;
          });
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
    if (!data?.allAirports) return [];
    const hubMetrics = new Map((data.hubs || []).map(hub => [hub.iata, hub]));
    return data.allAirports
      .filter(airport => airport.isDisrupted)
      .map(airport => ({ ...airport, ...(hubMetrics.get(airport.iata) || {}) }))
      .sort((a, b) => b.delayMinutes - a.delayMinutes || (b.hubImpactScore || 0) - (a.hubImpactScore || 0))
      .slice(0, 6);
  }, [data]);

  const disruptedHubs = data?.hubs?.filter(hub => hub.isDisrupted) || [];
  const affectedAirports = new Set(disruptedHubs.flatMap(hub => hub.connectedAirports.map(airport => airport.iata))).size;

  return (
    <div className="app-shell">
      <header className="app-banner">
        <div className="banner-copy">
          <span className="eyebrow">National Airspace Situational Awareness</span>
          <h1>Hub Resilience Monitor</h1>
          <p>Live U.S. airport operational status, hub disruption signals, and estimated downstream network impact.</p>
        </div>
        <div className="source-panel">
          <span className={`source-badge ${data?.sourceMode === 'live' ? 'source-live' : 'source-fallback'}`}>
            <span className="pulse-dot" />
            {data?.sourceLabel || 'Connecting to status service'}
          </span>
          <span>FAA update: {formatTime(data?.faaUpdatedAt)}</span>
          <span>Dashboard fetch: {formatTime(data?.fetchedAt)}</span>
        </div>
      </header>

      <main>
        <WelcomePage />

        {error && <div className="alert">Backend connection error: {error}</div>}
        {data?.sourceMode === 'fallback' && (
          <div className="alert warning">
            The FAA endpoint could not be reached. Dashboard status values are sample fallback data and are not live.
          </div>
        )}

        <section className="metric-strip" aria-label="Operational overview">
          <div className="metric-card"><span>Monitored airports</span><strong>{data?.allAirports?.length ?? '—'}</strong></div>
          <div className="metric-card"><span>Major hubs</span><strong>{data?.hubs?.length ?? '—'}</strong></div>
          <div className="metric-card"><span>Disrupted hubs</span><strong className={disruptedHubs.length ? 'text-alert' : ''}>{disruptedHubs.length}</strong></div>
          <div className="metric-card"><span>Potentially connected</span><strong>{affectedAirports}</strong></div>
        </section>

        <section className="dashboard-grid primary-grid">
          <div className="card map-card">
            <MapView airports={data?.allAirports || []} onSelect={setSelectedAirport} />
          </div>
          <div className="card">
            <HubImpact hubs={data?.hubs || []} onSelect={setSelectedAirport} />
          </div>
        </section>

        <section className="dashboard-grid secondary-grid">
          <div className="card">
            <TopDelays topDelayed={topDelayed} onSelect={setSelectedAirport} />
          </div>
          <div className="card network-card">
            <NetworkView
              hubs={data?.hubs || []}
              airports={data?.allAirports || []}
              selectedAirport={selectedAirport}
              onSelect={setSelectedAirport}
            />
          </div>
          <div className="card">
            <AirportDetail airport={selectedAirport} />
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>{data?.notice || 'FAA data shows airport-level operational status, not every individual flight.'}</span>
        <span>Static local route network · Estimated impact score</span>
      </footer>
    </div>
  );
}

export default App;
