import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const HUB_CODES = [
  'ATL', 'ORD', 'DFW', 'DEN', 'LAX', 'JFK', 'EWR', 'SFO', 'SEA', 'CLT', 'PHX', 'IAH', 'LAS', 'MIA',
];

export const FAA_API_URL = 'https://nasstatus.faa.gov/api/airport-status-information';
export const FETCH_INTERVAL_MS = 5 * 60 * 1000;

let latestStatus = {
  sourceMode: 'initializing',
  sourceLabel: 'Waiting for FAA airport status',
  faaUpdatedAt: null,
  fetchedAt: null,
  refreshIntervalMinutes: 5,
  notice: 'FAA data shows airport-level operational status, not every individual flight.',
  hubs: [],
  allAirports: [],
  routes: [],
};

async function readJson(relativePath) {
  const filePath = path.resolve(__dirname, '../data', relativePath);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value) {
  if (value == null) return '';
  if (typeof value === 'object' && '_' in value) return String(value._).trim();
  return String(value).trim();
}

function parseMinutes(value) {
  const match = text(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getCategoryEntries(value) {
  if (!value || typeof value !== 'object') return [];
  if ('ARPT' in value) return [value];
  return Object.values(value).flatMap(item => asArray(item).flatMap(getCategoryEntries));
}

function categoryKind(name) {
  const lower = name.toLowerCase();
  if (lower.includes('ground stop')) return 'Ground Stop';
  if (lower.includes('ground delay')) return 'Ground Delay Program';
  if (lower.includes('closure')) return 'Closure';
  if (lower.includes('deicing')) return 'Weather Delay';
  return 'Delay';
}

function normalizeEntry(entry, kind) {
  const arrivalDeparture = entry?.Arrival_Departure;
  const min = parseMinutes(arrivalDeparture?.Min || entry?.Avg || entry?.Min || entry?.Delay);
  const max = parseMinutes(arrivalDeparture?.Max || entry?.Max);
  const delayMinutes = max || min;
  const reason = text(entry?.Reason);
  const airportCode = text(entry?.ARPT || entry?.Airport || entry?.airportCode).toUpperCase();
  const weatherDelay = /WX|weather|thunderstorm|snow|wind|fog|deicing/i.test(reason);
  const disruptionType = weatherDelay && kind === 'Delay' ? 'Weather Delay' : kind;

  return {
    airportCode,
    status: reason || kind,
    disruptionType,
    delayMinutes,
    delayRange: min || max ? { min, max: max || min } : null,
    groundStop: disruptionType === 'Ground Stop',
    groundDelayProgram: disruptionType === 'Ground Delay Program',
    closure: disruptionType === 'Closure',
    weatherDelay: weatherDelay || kind === 'Weather Delay',
    trend: text(arrivalDeparture?.Trend || entry?.Trend),
    start: text(entry?.Start),
    end: text(entry?.Reopen || entry?.End_Time),
  };
}

function mergeStatus(existing, incoming) {
  if (!existing) return incoming;
  const priority = { Closure: 5, 'Ground Stop': 4, 'Ground Delay Program': 3, 'Weather Delay': 2, Delay: 1 };
  const primary = (priority[incoming.disruptionType] || 0) > (priority[existing.disruptionType] || 0)
    ? incoming
    : existing;

  return {
    ...primary,
    delayMinutes: Math.max(existing.delayMinutes, incoming.delayMinutes),
    delayRange: primary.delayRange || existing.delayRange || incoming.delayRange,
    groundStop: existing.groundStop || incoming.groundStop,
    groundDelayProgram: existing.groundDelayProgram || incoming.groundDelayProgram,
    closure: existing.closure || incoming.closure,
    weatherDelay: existing.weatherDelay || incoming.weatherDelay,
    status: [existing.status, incoming.status].filter(Boolean).join(' | '),
  };
}

export async function parseFaaStatusXml(xmlText) {
  const json = await parseStringPromise(xmlText, { explicitArray: false, mergeAttrs: true });
  const root = json?.AIRPORT_STATUS_INFORMATION || json?.['airport-status-information'] || json;
  const statusMap = new Map();

  for (const delayType of asArray(root?.Delay_type)) {
    const kind = categoryKind(text(delayType?.Name));
    for (const entry of getCategoryEntries(delayType)) {
      const normalized = normalizeEntry(entry, kind);
      if (!normalized.airportCode) continue;
      statusMap.set(normalized.airportCode, mergeStatus(statusMap.get(normalized.airportCode), normalized));
    }
  }

  return {
    faaUpdatedAt: text(root?.Update_Time) || null,
    statuses: Array.from(statusMap.values()),
  };
}

function classifySeverity(status) {
  if (!status) return 'green';
  if (status.closure || status.groundStop) return 'red';
  if (status.groundDelayProgram || status.delayMinutes >= 60) return 'orange';
  if (status.delayMinutes > 0 || status.weatherDelay || status.disruptionType !== 'Normal') return 'yellow';
  return 'green';
}

function buildNetwork(routes) {
  const neighbors = new Map();
  for (const { origin, destination } of routes) {
    if (!origin || !destination) continue;
    if (!neighbors.has(origin)) neighbors.set(origin, new Set());
    if (!neighbors.has(destination)) neighbors.set(destination, new Set());
    neighbors.get(origin).add(destination);
    neighbors.get(destination).add(origin);
  }
  return neighbors;
}

function normalStatus(code) {
  return {
    airportCode: code,
    status: 'No active FAA airport status advisory',
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

export function buildDashboardData({ airports, routes, statuses, sourceMode, sourceLabel, faaUpdatedAt, fetchedAt }) {
  const normalizedStatuses = statuses.map(item => ({
    ...normalStatus(item.airportCode),
    ...item,
    disruptionType: inferDisruptionType(item),
  }));
  const statusMap = new Map(normalizedStatuses.map(item => [item.airportCode, item]));
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
    const airport = dashboardAirportByCode.get(code) || { ...normalStatus(code), iata: code, name: code, lat: 0, lon: 0 };
    const connectedCodes = Array.from(network.get(code) || []).sort();
    const connectedAirports = connectedCodes.map(connectedCode => {
      const connected = airportByCode.get(connectedCode);
      return connected || { iata: connectedCode, name: connectedCode };
    });
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
      affected_airports_count: affectedAirportsCount,
      disruption_type: airport.disruptionType,
      average_delay_minutes: averageDelayMinutes,
      hub_connectivity_score: hubConnectivityScore,
      hub_impact_score: hubImpactScore,
    };
  });

  return {
    sourceMode,
    sourceLabel,
    faaUpdatedAt,
    fetchedAt,
    refreshIntervalMinutes: 5,
    notice: 'FAA data shows airport-level operational status, not every individual flight.',
    methodology: 'Estimated Hub Impact Score = delay minutes × 0.5 + affected airports × 2 + connectivity score × 0.3.',
    hubs,
    allAirports,
    routes,
  };
}

export async function refreshLiveStatus() {
  const [airports, routes] = await Promise.all([readJson('airports.json'), readJson('routes.json')]);
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(FAA_API_URL, {
      headers: { Accept: 'application/xml,text/xml' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`FAA API returned ${response.status}`);
    const parsed = await parseFaaStatusXml(await response.text());
    latestStatus = buildDashboardData({
      airports,
      routes,
      statuses: parsed.statuses,
      sourceMode: 'live',
      sourceLabel: 'Live FAA airport status',
      faaUpdatedAt: parsed.faaUpdatedAt,
      fetchedAt,
    });
    console.log(`[status] Loaded ${parsed.statuses.length} live FAA airport advisories`);
  } catch (error) {
    const fallback = await readJson('fallback_status.json');
    latestStatus = buildDashboardData({
      airports,
      routes,
      statuses: fallback,
      sourceMode: 'fallback',
      sourceLabel: 'Sample fallback status data (not live)',
      faaUpdatedAt: null,
      fetchedAt,
    });
    console.warn(`[status] FAA fetch failed; using sample fallback data: ${error.message}`);
  }

  return latestStatus;
}

export function getLatestStatus() {
  return latestStatus;
}

export async function startStatusRefresh() {
  await refreshLiveStatus();
  const timer = setInterval(refreshLiveStatus, FETCH_INTERVAL_MS);
  timer.unref?.();
}
