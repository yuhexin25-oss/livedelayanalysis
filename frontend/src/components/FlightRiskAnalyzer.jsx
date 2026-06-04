import { useMemo, useState } from 'react';

const severityWeights = {
  green: { origin: 0, destination: 0 },
  yellow: { origin: 12, destination: 8 },
  orange: { origin: 24, destination: 18 },
  red: { origin: 38, destination: 30 },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatAirportLabel(airport) {
  if (!airport) return '';
  return `${airport.iata} - ${airport.name}`;
}

function getAirportConnectivity(airport, routeDegree) {
  return airport?.connectedAirports?.length ?? airport?.hubConnectivityScore ?? routeDegree.get(airport?.iata) ?? 0;
}

function getRiskLevel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Moderate';
  return 'Low';
}

function getRecommendation(level) {
  if (level === 'High') {
    return 'Monitor departure status closely. Consider backup options if travel is time-sensitive.';
  }
  if (level === 'Moderate') {
    return 'Monitor airport conditions before departure and leave extra buffer time.';
  }
  return 'No major airport-level risk signals are visible right now. Continue normal travel monitoring.';
}

function buildAssessment({ origin, destination, routes, routeDegree }) {
  if (!origin || !destination) return null;

  const directRoute = routes.some(route => (
    (route.origin === origin.iata && route.destination === destination.iata)
    || (route.origin === destination.iata && route.destination === origin.iata)
  ));
  const originConnectivity = getAirportConnectivity(origin, routeDegree);
  const destinationConnectivity = getAirportConnectivity(destination, routeDegree);
  const averageConnectivity = (originConnectivity + destinationConnectivity) / 2;
  const originSeverity = severityWeights[origin.severity] || severityWeights.green;
  const destinationSeverity = severityWeights[destination.severity] || severityWeights.green;

  let score = 10 + originSeverity.origin + destinationSeverity.destination;
  score += Math.min(25, (origin.hubImpactScore || 0) * 0.25);
  score += Math.min(15, (destination.hubImpactScore || 0) * 0.18);
  score += averageConnectivity >= 10 ? 12 : averageConnectivity >= 6 ? 8 : averageConnectivity >= 3 ? 4 : 0;
  score += directRoute ? 8 : 14;
  score += origin.isHub ? 4 : 0;
  score += destination.isHub ? 4 : 0;

  const riskScore = Math.round(clamp(score, 0, 100));
  const riskLevel = getRiskLevel(riskScore);
  const contributingFactors = [];

  if (origin.isDisrupted) contributingFactors.push('FAA operational disruption at origin airport');
  if (destination.isDisrupted) contributingFactors.push('FAA operational disruption at destination airport');
  if ((origin.hubImpactScore || 0) >= 45 || (destination.hubImpactScore || 0) >= 45) {
    contributingFactors.push('Elevated Hub Impact Score');
  }
  if (averageConnectivity >= 6) contributingFactors.push('High network connectivity exposure');
  if (directRoute) contributingFactors.push('Static route network shows direct route exposure');
  if (!directRoute) contributingFactors.push('No direct static route found; connection complexity may increase exposure');
  if (origin.isHub || destination.isHub) contributingFactors.push('Major hub airport involved in itinerary');
  if (!contributingFactors.length) {
    contributingFactors.push('No major disruption factors detected in current airport-level data');
  }

  return {
    riskScore,
    riskLevel,
    directRoute,
    originConnectivity,
    destinationConnectivity,
    contributingFactors,
    recommendation: getRecommendation(riskLevel),
  };
}

export default function FlightRiskAnalyzer({ airports, routes, sourceMode, faaUpdatedAt }) {
  const sortedAirports = useMemo(
    () => [...airports].sort((a, b) => a.iata.localeCompare(b.iata)),
    [airports],
  );
  const [airline, setAirline] = useState('');
  const [originCode, setOriginCode] = useState('ATL');
  const [destinationCode, setDestinationCode] = useState('LAX');

  const airportByCode = useMemo(
    () => new Map(sortedAirports.map(airport => [airport.iata, airport])),
    [sortedAirports],
  );

  const routeDegree = useMemo(() => {
    const degree = new Map();
    for (const route of routes || []) {
      degree.set(route.origin, (degree.get(route.origin) || 0) + 1);
      degree.set(route.destination, (degree.get(route.destination) || 0) + 1);
    }
    return degree;
  }, [routes]);

  const origin = airportByCode.get(originCode) || sortedAirports[0] || null;
  const destination = airportByCode.get(destinationCode) || sortedAirports[1] || origin;
  const assessment = buildAssessment({ origin, destination, routes: routes || [], routeDegree });
  const updateTime = faaUpdatedAt ? new Date(faaUpdatedAt).toLocaleString() : 'Not available';
  const sourceLabel = sourceMode === 'live' ? 'Live FAA airport status' : 'Sample airport status data';

  return (
    <section className="flight-risk-page">
      <div className="card flight-risk-intro">
        <span className="section-kicker">Flight-level analytics</span>
        <h2>Flight Risk Analyzer</h2>
        <p>
          Translate airport-level disruption signals into a route-level risk assessment using the current FAA
          operational status feed, static route connectivity, and estimated hub impact metrics.
        </p>
        <p className="panel-footnote">
          This is an analytical estimate generated by the Hub Resilience Monitor and is not an official FAA prediction.
        </p>
      </div>

      <div className="dashboard-grid flight-risk-grid">
        <form className="card risk-form" aria-label="Flight risk inputs" onSubmit={event => event.preventDefault()}>
          <div className="section-heading">
            <div>
              <span className="section-kicker">Inputs</span>
              <h2>Itinerary Signals</h2>
            </div>
          </div>
          <label className="risk-field">
            <span>Airline</span>
            <input
              value={airline}
              onChange={event => setAirline(event.target.value)}
              placeholder="Example: Delta, United, American"
            />
          </label>
          <label className="risk-field">
            <span>Origin Airport</span>
            <select value={origin?.iata || ''} onChange={event => setOriginCode(event.target.value)}>
              {sortedAirports.map(airport => (
                <option key={airport.iata} value={airport.iata}>{formatAirportLabel(airport)}</option>
              ))}
            </select>
          </label>
          <label className="risk-field">
            <span>Destination Airport</span>
            <select value={destination?.iata || ''} onChange={event => setDestinationCode(event.target.value)}>
              {sortedAirports.map(airport => (
                <option key={airport.iata} value={airport.iata}>{formatAirportLabel(airport)}</option>
              ))}
            </select>
          </label>
          <div className="risk-source-note">
            <span>{sourceLabel}</span>
            <span>FAA update: {updateTime}</span>
            <span>Static route network: local project data</span>
          </div>
        </form>

        <div className="card risk-output">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Output</span>
              <h2>Flight Risk Assessment</h2>
            </div>
            {airline && <span className="count-badge">{airline}</span>}
          </div>

          {assessment ? (
            <>
              <div className="risk-summary-grid">
                <div><span>Origin</span><strong>{origin.iata}</strong><small>{origin.name}</small></div>
                <div><span>Destination</span><strong>{destination.iata}</strong><small>{destination.name}</small></div>
                <div><span>Risk Score</span><strong>{assessment.riskScore} / 100</strong><small>Estimated analytical score</small></div>
                <div>
                  <span>Risk Level</span>
                  <strong className={`risk-level risk-${assessment.riskLevel.toLowerCase()}`}>{assessment.riskLevel}</strong>
                  <small>Not an actual delay prediction</small>
                </div>
              </div>

              <div className="risk-meter" aria-label={`Risk score ${assessment.riskScore} out of 100`}>
                <i style={{ width: `${assessment.riskScore}%` }} />
              </div>

              <div className="risk-details-grid">
                <div>
                  <h3>Contributing Factors</h3>
                  <ul className="risk-factors">
                    {assessment.contributingFactors.map(factor => <li key={factor}>{factor}</li>)}
                  </ul>
                </div>
                <div className="risk-recommendation">
                  <h3>Recommendation</h3>
                  <p>{assessment.recommendation}</p>
                  <small>
                    Route exposure: {assessment.directRoute ? `${origin.iata} to ${destination.iata} appears in static route data` : 'connection exposure estimated from network complexity'}
                  </small>
                </div>
              </div>

              <details className="risk-explainer">
                <summary>How is this score calculated?</summary>
                <ul>
                  <li>FAA operational status</li>
                  <li>Hub Impact Score</li>
                  <li>Network connectivity</li>
                  <li>Route exposure</li>
                  <li>Connection complexity</li>
                </ul>
                <p>
                  The score combines airport-level operational advisories with static route-network exposure and
                  estimated impact metrics. It does not predict actual flight delays.
                </p>
              </details>
            </>
          ) : (
            <p className="no-data">Airport data is still loading.</p>
          )}
        </div>
      </div>
    </section>
  );
}
