import { useMemo, useState } from 'react';

const connectionOptions = ['Direct', 'One-stop', 'Any'];

function riskLabel(score) {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

function formatAirportLabel(airport) {
  return airport ? `${airport.iata} - ${airport.name}` : '';
}

function airportDelay(airport) {
  return Math.max(airport?.departureDelayMinutes || 0, airport?.arrivalDelayMinutes || 0);
}

function routeExists(routes, origin, destination) {
  return routes.some(route => (
    (route.origin === origin && route.destination === destination)
    || (route.origin === destination && route.destination === origin)
  ));
}

function connectedCodes(routes, code) {
  return new Set(routes.flatMap(route => {
    if (route.origin === code) return [route.destination];
    if (route.destination === code) return [route.origin];
    return [];
  }));
}

function findSharedConnections(routes, origin, destination) {
  const originConnections = connectedCodes(routes, origin);
  const destinationConnections = connectedCodes(routes, destination);
  return [...originConnections].filter(code => destinationConnections.has(code)).sort();
}

function buildRouteAssessment({ origin, destination, routes, airports, connectionPreference, avoidDisruptedHubs }) {
  if (!origin || !destination || origin.iata === destination.iata) return null;

  const airportByCode = new Map(airports.map(airport => [airport.iata, airport]));
  const directRoute = routeExists(routes, origin.iata, destination.iata);
  const sharedConnections = findSharedConnections(routes, origin.iata, destination.iata)
    .map(code => airportByCode.get(code))
    .filter(Boolean);
  const highRiskConnections = sharedConnections.filter(airport => (
    airport.isHub && ((airport.hubImpactScore || 0) >= 50 || ['orange', 'red'].includes(airport.severity))
  ));
  const candidateConnections = avoidDisruptedHubs
    ? sharedConnections.filter(airport => !highRiskConnections.some(hub => hub.iata === airport.iata))
    : sharedConnections;

  const originConnectivity = origin.connectedAirports?.length || origin.hubConnectivityScore || connectedCodes(routes, origin.iata).size;
  const destinationConnectivity = destination.connectedAirports?.length || destination.hubConnectivityScore || connectedCodes(routes, destination.iata).size;
  const networkConnectivityRisk = Math.min(100, Math.round((originConnectivity + destinationConnectivity) * 4));
  const hubExposureScore = Math.min(100, Math.round(Math.max(origin.hubImpactScore || 0, destination.hubImpactScore || 0, ...sharedConnections.map(airport => airport.hubImpactScore || 0))));
  const delayRisk = Math.max(airportDelay(origin), airportDelay(destination));
  const cancellationRisk = Math.max(origin.cancellationRate || 0, destination.cancellationRate || 0) * 200;
  const groundProgramBonus = origin.groundStop || destination.groundStop ? 25 : origin.groundDelayProgram || destination.groundDelayProgram ? 12 : 0;
  const connectionComplexity = connectionPreference === 'Direct' ? (directRoute ? 4 : 18)
    : connectionPreference === 'One-stop' ? 12
      : directRoute ? 6 : 14;

  const routeRiskScore = Math.min(100, Math.round(
    delayRisk * 0.45
    + cancellationRisk
    + hubExposureScore * 0.3
    + networkConnectivityRisk * 0.2
    + connectionComplexity
    + groundProgramBonus,
  ));
  const riskLevel = riskLabel(routeRiskScore);

  const reasons = [];
  reasons.push(`${origin.iata} is ${origin.isHub ? 'a major hub' : 'an airport'} with ${riskLabel(origin.hubImpactScore || 0).toLowerCase()} network exposure.`);
  reasons.push(`${destination.iata} currently shows ${destination.operationalStatus || 'normal commercial operational risk'}.`);
  if (originConnectivity + destinationConnectivity >= 16) {
    reasons.push('Route connects two high-connectivity airports, increasing propagation sensitivity.');
  }
  if (!directRoute && connectionPreference === 'Direct') {
    reasons.push('A direct connection is not present in the static route network, so direct routing may be limited in this model.');
  }
  if (highRiskConnections.length) {
    reasons.push(`Potential one-stop paths include elevated-risk hub${highRiskConnections.length > 1 ? 's' : ''}: ${highRiskConnections.map(airport => airport.iata).join(', ')}.`);
  }

  const suggestedRoutingStrategy = highRiskConnections.length && avoidDisruptedHubs
    ? `Avoid connecting through ${highRiskConnections.map(airport => airport.iata).join(', ')} if schedule reliability matters.`
    : directRoute && connectionPreference !== 'One-stop'
      ? 'Prefer direct routing to reduce connection exposure.'
      : candidateConnections.length
        ? `Consider one-stop options through lower-risk hubs such as ${candidateConnections.slice(0, 3).map(airport => airport.iata).join(', ')}.`
        : 'Monitor both endpoint airports and choose the simplest available routing.';

  return {
    origin,
    destination,
    directRoute,
    candidateConnections,
    highRiskConnections,
    routeRiskScore,
    riskLevel,
    originAirportRisk: riskLabel(origin.hubImpactScore || airportDelay(origin)),
    destinationAirportRisk: riskLabel(destination.hubImpactScore || airportDelay(destination)),
    hubExposureScore,
    networkConnectivityRisk,
    suggestedRoutingStrategy,
    reasons,
  };
}

function AirportSummary({ label, airport }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{airport?.iata || '—'}</strong>
      <small>{airport?.name}</small>
      <small>{airport?.operationalStatus || 'Normal operations'}</small>
    </div>
  );
}

export default function RouteRiskAnalyzer({ airports, routes, providerMode }) {
  const sortedAirports = useMemo(
    () => [...airports].sort((a, b) => a.iata.localeCompare(b.iata)),
    [airports],
  );
  const [originCode, setOriginCode] = useState('ATL');
  const [destinationCode, setDestinationCode] = useState('LAX');
  const [airlinePreference, setAirlinePreference] = useState('');
  const [connectionPreference, setConnectionPreference] = useState('Any');
  const [avoidDisruptedHubs, setAvoidDisruptedHubs] = useState(true);

  const airportByCode = useMemo(
    () => new Map(sortedAirports.map(airport => [airport.iata, airport])),
    [sortedAirports],
  );
  const origin = airportByCode.get(originCode) || sortedAirports[0] || null;
  const destination = airportByCode.get(destinationCode) || sortedAirports.find(airport => airport.iata !== origin?.iata) || null;
  const assessment = buildRouteAssessment({
    origin,
    destination,
    routes: routes || [],
    airports: sortedAirports,
    connectionPreference,
    avoidDisruptedHubs,
  });

  return (
    <section className="route-risk-page">
      <div className="card route-risk-intro">
        <span className="section-kicker">Route-level operational exposure</span>
        <h2>Route Delay Risk Analyzer</h2>
        <p>
          Compare airport pairs using live or estimated airport operational metrics, hub impact scores, static route
          connectivity, and FAA ground stop or ground delay program signals.
        </p>
        <p className="panel-footnote">
          This tool estimates route-level operational risk using airport status and network connectivity. It does not
          search live tickets, seats, prices, or airline rebooking inventory.
        </p>
      </div>

      <div className="dashboard-grid route-risk-grid">
        <form className="card risk-form" aria-label="Route delay risk analyzer" onSubmit={event => event.preventDefault()}>
          <div className="section-heading">
            <div>
              <span className="section-kicker">Route inputs</span>
              <h2>Analyze Airport Pair</h2>
            </div>
          </div>
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
          <label className="risk-field">
            <span>Airline Preference Optional</span>
            <input
              value={airlinePreference}
              onChange={event => setAirlinePreference(event.target.value)}
              placeholder="Example: Delta, United, American"
            />
          </label>
          <label className="risk-field">
            <span>Connection Preference Optional</span>
            <select value={connectionPreference} onChange={event => setConnectionPreference(event.target.value)}>
              {connectionOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="risk-check">
            <input
              type="checkbox"
              checked={avoidDisruptedHubs}
              onChange={event => setAvoidDisruptedHubs(event.target.checked)}
            />
            <span>Avoid disrupted hubs when possible</span>
          </label>
          <div className="risk-source-note">
            <span>{providerMode === 'flightaware' ? 'FlightAware-backed airport metrics active' : 'Airport-level live/estimated operational mode'}</span>
            <span>Airline preference is used as context only; no ticket inventory or flight schedule search is performed.</span>
          </div>
        </form>

        <div className="card risk-output">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Output</span>
              <h2>Route Risk Assessment</h2>
            </div>
            {assessment && <span className={`risk-level risk-${assessment.riskLevel.toLowerCase()}`}>{assessment.riskLevel}</span>}
          </div>

          {assessment ? (
            <>
              <div className="risk-summary-grid">
                <AirportSummary label="Origin" airport={assessment.origin} />
                <AirportSummary label="Destination" airport={assessment.destination} />
                <div><span>Route Risk Score</span><strong>{assessment.routeRiskScore} / 100</strong><small>{assessment.riskLevel}</small></div>
                <div><span>Connection Model</span><strong>{connectionPreference}</strong><small>{assessment.directRoute ? 'Direct route in static network' : 'No direct route in static network'}</small></div>
              </div>

              <div className="risk-meter" aria-label={`Route risk score ${assessment.routeRiskScore} out of 100`}>
                <i style={{ width: `${assessment.routeRiskScore}%` }} />
              </div>

              <div className="risk-details-grid">
                <div>
                  <h3>Reason</h3>
                  <ul className="risk-factors">
                    {assessment.reasons.map(reason => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
                <div className="risk-recommendation">
                  <h3>Suggested Routing Strategy</h3>
                  <p>{assessment.suggestedRoutingStrategy}</p>
                  {airlinePreference && <small>Airline preference: {airlinePreference}</small>}
                </div>
              </div>

              <div className="risk-summary-grid route-metrics-grid">
                <div><span>Origin Airport Risk</span><strong>{assessment.originAirportRisk}</strong><small>{assessment.origin.iata}</small></div>
                <div><span>Destination Airport Risk</span><strong>{assessment.destinationAirportRisk}</strong><small>{assessment.destination.iata}</small></div>
                <div><span>Hub Exposure Score</span><strong>{assessment.hubExposureScore}</strong><small>Endpoint and candidate hub exposure</small></div>
                <div><span>Network Connectivity Risk</span><strong>{assessment.networkConnectivityRisk}</strong><small>Static route degree sensitivity</small></div>
              </div>
            </>
          ) : (
            <p className="no-data">Choose two different airports to calculate route risk.</p>
          )}
        </div>
      </div>
    </section>
  );
}
