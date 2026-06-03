import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUB_CODES = [
  'ATL', 'ORD', 'DFW', 'DEN', 'LAX', 'JFK', 'EWR', 'SFO', 'SEA', 'CLT', 'PHX', 'IAH', 'LAS', 'MIA'
];
const FAA_API_URL = 'https://nasstatus.faa.gov/api/airport-status-information';
const FETCH_INTERVAL_MS = 5 * 60 * 1000;

let latestStatus = {
  source: 'fallback',
  updatedAt: null,
  hubs: [],
  allAirports: [],
  routes: [],
};

async function readJson(relativePath) {
  const filePath = path.resolve(__dirname, '../../data', relativePath);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

function findStatusNodes(parsed) {
  if (!parsed || typeof parsed !== 'object') return [];
  const keys = Object.keys(parsed);
  for (const key of keys) {
    if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
      const item = parsed[key][0];
      if (item && typeof item === 'object' && Object.keys(item).some(k => /airport/i.test(k))) {
        if (Array.isArray(parsed[key])) {
          return parsed[key];
        }
      }
    }
  }
  return [];
}

function parseFaaStatusXml(xmlText) {
  return parseStringPromise(xmlText, { explicitArray: false, mergeAttrs: true })
    .then(json => {
      const airportStatusArray = [];
      if (!json) return airportStatusArray;
      const root = json['airport-status-information'] || json;
      const statusNodes = root?.['airport-status'] || root?.airportStatus || root?.AirportStatus || [];
      const entries = Array.isArray(statusNodes) ? statusNodes : [statusNodes];
      for (const item of entries) {
        if (!item) continue;
        const airport = item.airport || item.Airport || item.code || item.icao || item.iata;
        airportStatusArray.push({
          airportCode: String(item.airportCode || airport || '').trim(),
          airportName: String(item.airportName || item.name || '').trim(),
          status: String(item.status || item.operationalStatus || '').trim(),
          delayMinutes: Number(item.delayMinutes || item.delay || item.minutes || 0) || 0,
          groundStop: item.groundStop === 'true' || item.groundStop === true,
          groundDelayProgram: item.groundDelayProgram === 'true' || item.groundDelayProgram === true,
          closure: item.closure === 'true' || item.closure === true,
          weatherDelay: item.weatherDelay === 'true' || item.weatherDelay === true,
          raw: item,
        });
      }
      return airportStatusArray;
    })
    .catch(() => []);
}

function classifySeverity(statusItem) {
  if (!statusItem) return 'green';
  const { delayMinutes, groundStop, closure, weatherDelay, groundDelayProgram, status } = statusItem;
  if (groundStop || closure || status.toLowerCase().includes('closure') || status.toLowerCase().includes('ground stop')) {
    return 'red';
  }
  if (weatherDelay || groundDelayProgram || delayMinutes >= 60 || status.toLowerCase().includes('major')) {
    return 'orange';
  }
  if (delayMinutes > 15 || status.toLowerCase().includes('minor') || status.toLowerCase().includes('delay')) {
    return 'yellow';
  }
  return 'green';
}

function getDisruptionType(statusItem) {
  if (!statusItem) return 'Normal';
  if (statusItem.closure) return 'Closure';
  if (statusItem.groundStop) return 'Ground Stop';
  if (statusItem.groundDelayProgram) return 'Ground Delay Program';
  if (statusItem.weatherDelay) return 'Weather Delay';
  if (statusItem.delayMinutes > 0) return 'Delay';
  return statusItem.status || 'Normal';
}

function computeHubMetrics(statusMap, airports, routes) {
  const airportByCode = new Map(airports.map(a => [a.iata, a]));
  const routesByHub = new Map();
  for (const route of routes) {
    const origin = route.origin;
    const destination = route.destination;
    if (!origin || !destination) continue;
    if (!routesByHub.has(origin)) routesByHub.set(origin, new Set());
    if (!routesByHub.has(destination)) routesByHub.set(destination, new Set());
    routesByHub.get(origin).add(destination);
    routesByHub.get(destination).add(origin);
  }
  const hubs = HUB_CODES.map(code => {
    const airport = airportByCode.get(code) || { iata: code, name: code, lat: 0, lon: 0 };
    const status = statusMap.get(code) || {
      airportCode: code,
      airportName: airport.name,
      status: 'No live FAA data',
      delayMinutes: 0,
      groundStop: false,
      groundDelayProgram: false,
      closure: false,
      weatherDelay: false,
    };
    const connected = routesByHub.get(code) || new Set();
    const affectedAirports = Array.from(connected).map(code => airportByCode.get(code) || { iata: code, name: code });
    const affectedAirportsCount = affectedAirports.length;
    const hubConnectivityScore = Math.round(connected.size * 1.5);
    const averageDelayMinutes = status.delayMinutes || 0;
    const disruptionType = getDisruptionType(status);
    const isDisrupted = disruptionType !== 'Normal' && disruptionType !== 'No live FAA data';
    const hubImpactScore = Number((averageDelayMinutes * 0.5 + affectedAirportsCount * 2 + hubConnectivityScore * 0.3).toFixed(1));
    return {
      ...airport,
      iata: code,
      status: status.status,
      severity: classifySeverity(status),
      disruptionType,
      delayMinutes: averageDelayMinutes,
      affectedAirportsCount,
      hubConnectivityScore,
      hubImpactScore,
      connectedAirports: affectedAirports,
      isDisrupted,
      lastUpdated: status.lastUpdated || null,
    };
  });
  return hubs;
}

async function refreshLiveStatus() {
  try {
    const response = await fetch(FAA_API_URL, { method: 'GET' });
    if (!response.ok) throw new Error(`FAA API status ${response.status}`);
    const xmlText = await response.text();
    const rawStatus = await parseFaaStatusXml(xmlText);
    const airports = await readJson('airports.json');
    const routes = await readJson('routes.json');
    const statusMap = new Map(rawStatus.filter(Boolean).map(item => [item.airportCode, item]));
    const hubs = computeHubMetrics(statusMap, airports, routes);
    latestStatus = {
      source: 'FAA live airport status',
      updatedAt: new Date().toISOString(),
      hubs,
      allAirports: airports,
      routes,
    };
    console.log('[status] Loaded FAA live airport status with', rawStatus.length, 'records');
  } catch (error) {
    console.warn('[status] FAA live fetch failed:', error.message);
    const airports = await readJson('airports.json');
    const routes = await readJson('routes.json');
    const fallback = await readJson('fallback_status.json');
    const statusMap = new Map(fallback.map(item => [item.airportCode, item]));
    const hubs = computeHubMetrics(statusMap, airports, routes);
    latestStatus = {
      source: 'fallback FAA status sample data',
      updatedAt: new Date().toISOString(),
      hubs,
      allAirports: airports,
      routes,
    };
  }
}

await refreshLiveStatus();
setInterval(refreshLiveStatus, FETCH_INTERVAL_MS);

export default (req, res) => {
  res.json(latestStatus);
};
