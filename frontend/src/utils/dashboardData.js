const HUB_CODES = [
  'ATL', 'ORD', 'DFW', 'DEN', 'LAX', 'JFK', 'EWR', 'SFO', 'SEA', 'CLT', 'PHX', 'IAH', 'LAS', 'MIA',
];

function normalStatus(code) {
  return {
    airportCode: code,
    status: 'No active sample status advisory',
    disruptionType: 'Normal',
    delayMinutes: 0,
    delayRange: null,
    groundStop: false,
    groundDelayProgram: false,
    closure: false,
    weatherDelay: false,
    trend: '',
    start: '',
    end: '',
  };
}

function inferDisruptionType(status) {
  if (status.disruptionType) return status.disruptionType;
  if (status.closure) return 'Closure';
  if (status.groundStop) return 'Ground Stop';
  if (status.groundDelayProgram) return 'Ground Delay Program';
  if (status.weatherDelay) return 'Weather Delay';
  if (status.delayMinutes > 0 || /delay/i.test(status.status || '')) return 'Delay';
  return 'Normal';
}

function classifySeverity(status) {
  if (status.closure || status.groundStop) return 'red';
  if (status.groundDelayProgram || status.delayMinutes >= 60) return 'orange';
  if (status.delayMinutes > 0 || status.weatherDelay || status.disruptionType !== 'Normal') return 'yellow';
  return 'green';
}

function buildNetwork(routes) {
  const neighbors = new Map();
  for (const { origin, destination } of routes) {
    if (!neighbors.has(origin)) neighbors.set(origin, new Set());
    if (!neighbors.has(destination)) neighbors.set(destination, new Set());
    neighbors.get(origin).add(destination);
    neighbors.get(destination).add(origin);
  }
  return neighbors;
}

export function buildFallbackDashboardData({ airports, routes, statuses }) {
  const normalizedStatuses = statuses.map(status => ({
    ...normalStatus(status.airportCode),
    ...status,
    disruptionType: inferDisruptionType(status),
  }));
  const statusMap = new Map(normalizedStatuses.map(status => [status.airportCode, status]));
  const network = buildNetwork(routes);
  const airportByCode = new Map(airports.map(airport => [airport.iata, airport]));

  const allAirports = airports.map(airport => {
    const status = statusMap.get(airport.iata) || normalStatus(airport.iata);
    return {
      ...airport,
      ...status,
      severity: classifySeverity(status),
      isHub: HUB_CODES.includes(airport.iata),
      isDisrupted: status.disruptionType !== 'Normal',
    };
  });

  const dashboardAirportByCode = new Map(allAirports.map(airport => [airport.iata, airport]));
  const hubs = HUB_CODES.map(code => {
    const airport = dashboardAirportByCode.get(code);
    const connectedAirports = Array.from(network.get(code) || [])
      .sort()
      .map(connectedCode => airportByCode.get(connectedCode) || { iata: connectedCode, name: connectedCode });
    const affectedAirportsCount = airport.isDisrupted ? connectedAirports.length : 0;
    const hubConnectivityScore = connectedAirports.length;
    const averageDelayMinutes = airport.delayMinutes;
    const hubImpactScore = airport.isDisrupted
      ? Number((averageDelayMinutes * 0.5 + affectedAirportsCount * 2 + hubConnectivityScore * 0.3).toFixed(1))
      : 0;

    return {
      ...airport,
      connectedAirports,
      affectedAirportsCount,
      averageDelayMinutes,
      hubConnectivityScore,
      hubImpactScore,
    };
  });

  return {
    sourceMode: 'fallback',
    sourceLabel: 'Sample Data Mode',
    faaUpdatedAt: null,
    fetchedAt: new Date().toISOString(),
    notice: 'Using sample fallback data — backend not connected',
    hubs,
    allAirports,
    routes,
  };
}
