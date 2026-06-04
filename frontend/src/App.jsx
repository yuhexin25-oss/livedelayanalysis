import { useEffect, useMemo, useState } from 'react';
import WelcomePage from './components/WelcomePage.jsx';
import MapView from './components/MapView.jsx';
import TopDelays from './components/TopDelays.jsx';
import HubImpact from './components/HubImpact.jsx';
import NetworkView from './components/NetworkView.jsx';
import AirportDetail from './components/AirportDetail.jsx';
import AirportSearch from './components/AirportSearch.jsx';
import MethodologyModal from './components/MethodologyModal.jsx';
import TrendPanel from './components/TrendPanel.jsx';
import { buildFallbackDashboardData } from './utils/dashboardData.js';

const refreshIntervalMs = 60 * 1000;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const FALLBACK_DATA_BASE_URL = `${import.meta.env.BASE_URL}data`;

function hasValidApiBaseUrl() {
  try {
    const url = new URL(API_BASE_URL);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON but received ${contentType || 'an unknown content type'}`);
  }
  return response.json();
}

async function loadFallbackData() {
  const [statuses, airports, routes] = await Promise.all([
    fetchJson(`${FALLBACK_DATA_BASE_URL}/fallback-status.json`),
    fetchJson(`${FALLBACK_DATA_BASE_URL}/airports.json`),
    fetchJson(`${FALLBACK_DATA_BASE_URL}/routes.json`),
  ]);
  return buildFallbackDashboardData({ statuses, airports, routes });
}

function formatTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function App() {
  const [data, setData] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [backendMessage, setBackendMessage] = useState(null);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchStatus() {
      let payload;
      try {
        if (!hasValidApiBaseUrl()) {
          throw new Error('VITE_API_BASE_URL is not configured with an absolute URL');
        }
        payload = await fetchJson(`${API_BASE_URL}/api/status`);
        if (!payload?.allAirports || !payload?.hubs || !payload?.routes) {
          throw new Error('Backend response is missing dashboard data');
        }
        if (mounted) {
          setBackendMessage(payload.sourceMode === 'live'
            ? null
            : 'Backend connected, but it is serving sample fallback data. These values are not live.');
        }
      } catch (err) {
        try {
          payload = await loadFallbackData();
          if (mounted) setBackendMessage('Using sample fallback data — backend not connected');
        } catch (fallbackError) {
          if (mounted) {
            setBackendMessage(`Unable to load backend or fallback data: ${fallbackError.message}`);
          }
          return;
        }
      }

      if (mounted) {
        setData(payload);
        setSelectedAirport(current => {
          if (!current) return payload.hubs?.find(hub => hub.isDisrupted) || payload.hubs?.[0] || null;
          return payload.hubs?.find(hub => hub.iata === current.iata)
            || payload.allAirports?.find(airport => airport.iata === current.iata)
            || current;
        });
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshIntervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const enrichedAirports = useMemo(() => {
    if (!data?.allAirports) return [];
    const hubMetrics = new Map((data.hubs || []).map(hub => [hub.iata, hub]));
    const routeDegree = new Map();
    for (const route of data.routes || []) {
      routeDegree.set(route.origin, (routeDegree.get(route.origin) || 0) + 1);
      routeDegree.set(route.destination, (routeDegree.get(route.destination) || 0) + 1);
    }

    return data.allAirports.map(airport => {
      const hub = hubMetrics.get(airport.iata);
      if (hub) return { ...airport, ...hub };
      const connectedAirportsCount = routeDegree.get(airport.iata) || 0;
      return {
        ...airport,
        connectedAirports: [],
        affectedAirportsCount: airport.isDisrupted ? connectedAirportsCount : 0,
        averageDelayMinutes: airport.delayMinutes || 0,
        hubConnectivityScore: connectedAirportsCount,
        hubImpactScore: 0,
      };
    });
  }, [data]);

  const topDelayed = useMemo(() => {
    if (!enrichedAirports.length) return [];
    return enrichedAirports
      .filter(airport => airport.isDisrupted)
      .sort((a, b) => b.delayMinutes - a.delayMinutes || (b.hubImpactScore || 0) - (a.hubImpactScore || 0))
      .slice(0, 6);
  }, [enrichedAirports]);

  const disruptedHubs = data?.hubs?.filter(hub => hub.isDisrupted) || [];
  const affectedAirports = new Set(disruptedHubs.flatMap(hub => hub.connectedAirports.map(airport => airport.iata))).size;
  const selectedAirportView = enrichedAirports.find(airport => airport.iata === selectedAirport?.iata) || selectedAirport;

  function handleAirportSelect(airport) {
    const enriched = enrichedAirports.find(item => item.iata === airport.iata) || airport;
    setSelectedAirport(enriched);
  }

  return (
    <div className="app-shell">
      <header className="app-banner">
        <div className="banner-copy">
          <span className="eyebrow">National Airspace Situational Awareness</span>
          <h1>Hub Resilience Monitor</h1>
          <p>
            {data?.sourceMode === 'live'
              ? 'Live U.S. airport operational status, hub disruption signals, and estimated downstream network impact.'
              : 'U.S. airport hub disruption scenarios and estimated downstream network impact.'}
          </p>
        </div>
        <div className="source-panel">
          <span className={`source-badge ${data?.sourceMode === 'live' ? 'source-live' : 'source-fallback'}`}>
            <span className="pulse-dot" />
            {data ? (data.sourceMode === 'live' ? 'Live FAA Backend Connected' : 'Sample Data Mode') : 'Loading dashboard data'}
          </span>
          <span>FAA update: {formatTime(data?.faaUpdatedAt)}</span>
          <span>Dashboard fetch: {formatTime(data?.fetchedAt)}</span>
        </div>
      </header>

      <main>
        <WelcomePage sourceMode={data?.sourceMode} />

        {backendMessage && <div className="alert warning">{backendMessage}</div>}

        <section className="control-bar" aria-label="Airport search and methodology controls">
          <AirportSearch airports={enrichedAirports} onSelect={handleAirportSelect} />
          <button className="methodology-button" type="button" onClick={() => setIsMethodologyOpen(true)}>
            Methodology
          </button>
        </section>

        <section className="metric-strip" aria-label="Operational overview">
          <div className="metric-card"><span>Monitored airports</span><strong>{data?.allAirports?.length ?? '—'}</strong></div>
          <div className="metric-card"><span>Major hubs</span><strong>{data?.hubs?.length ?? '—'}</strong></div>
          <div className="metric-card"><span>Disrupted hubs</span><strong className={disruptedHubs.length ? 'text-alert' : ''}>{disruptedHubs.length}</strong></div>
          <div className="metric-card"><span>Potentially connected</span><strong>{affectedAirports}</strong></div>
        </section>

        <section className="dashboard-grid primary-grid">
          <div className="card map-card">
            <MapView
              airports={enrichedAirports}
              selectedAirport={selectedAirportView}
              sourceMode={data?.sourceMode}
              onSelect={handleAirportSelect}
            />
          </div>
          <div className="card">
            <HubImpact hubs={data?.hubs || []} sourceMode={data?.sourceMode} onSelect={handleAirportSelect} />
          </div>
        </section>

        <section className="dashboard-grid secondary-grid">
          <div className="card">
            <TopDelays topDelayed={topDelayed} onSelect={handleAirportSelect} />
          </div>
          <div className="card network-card">
            <NetworkView
              hubs={data?.hubs || []}
              airports={enrichedAirports}
              selectedAirport={selectedAirportView}
              onSelect={handleAirportSelect}
            />
          </div>
          <div className="card">
            <AirportDetail airport={selectedAirportView} sourceMode={data?.sourceMode} faaUpdatedAt={data?.faaUpdatedAt} />
          </div>
        </section>

        <section className="dashboard-grid insight-grid">
          <div className="card">
            <TrendPanel airport={selectedAirportView} sourceMode={data?.sourceMode} />
          </div>
          <section className="card about-card">
            <span className="section-kicker">About this project</span>
            <h2>Transportation Analytics & Network Science</h2>
            <p>
              This project combines live FAA airport advisories, route network data, and custom network impact scoring
              to explore how hub disruptions may affect the broader U.S. air transportation system.
            </p>
          </section>
        </section>
      </main>

      <footer className="app-footer">
        <span>{data?.notice || 'FAA data shows airport-level operational status, not every individual flight.'}</span>
        <span>Built with React, Leaflet, D3, Node.js/Express, Render, and GitHub Pages.</span>
      </footer>
      {isMethodologyOpen && (
        <MethodologyModal
          refreshIntervalMinutes={data?.refreshIntervalMinutes || 5}
          onClose={() => setIsMethodologyOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
