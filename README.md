# Hub Resilience Monitor

Hub Resilience Monitor is a real-time U.S. airport delay and hub disruption dashboard. It combines FAA airport-level operational advisories with a static local route network to estimate how disruptions at major hubs may affect connected airports.

The dashboard is explicit about provenance:

- **Live FAA airport status** is fetched from the FAA every five minutes.
- **Static route network data** is stored locally in `data/`.
- **Hub Impact Score** is an estimate, not an FAA metric or a confirmed flight-delay forecast.
- **Fallback status data** is clearly labeled as sample data and is never presented as live.

## Features

- Welcome and methodology overview
- Live U.S. airport delay map using Leaflet
- Top delayed airports ranking
- Major hub disruption monitoring
- Estimated Hub Impact Score
- D3-based delay propagation network for connected airports
- Airport detail panel
- Five-minute backend cache and sample fallback data

Major hubs monitored: ATL, ORD, DFW, DEN, LAX, JFK, EWR, SFO, SEA, CLT, PHX, IAH, LAS, and MIA.

## Project Structure

```text
backend/   Node.js and Express API
frontend/  React and Vite dashboard
data/      Local airport, route, and fallback status JSON
```

## Install

Node.js 18 or newer is required.

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run the Backend

```bash
cd backend
npm start
```

The backend listens on `http://localhost:3000` and exposes:

- `GET /` health message
- `GET /api/status` normalized dashboard JSON

For development with automatic restarts:

```bash
npm run dev
```

## Run the Frontend

```bash
cd frontend
npm run dev
```

Vite runs at `http://localhost:5173` and proxies `/api` requests to the local backend.

Build the static frontend with:

```bash
npm run build
```

## Tests

```bash
cd backend
npm test
```

The backend tests cover the FAA category-based XML parser and hub impact behavior.

## Data Sources

- FAA live airport status API: <https://nasstatus.faa.gov/api/airport-status-information>
- Local airport metadata: `data/airports.json`
- Local static route network: `data/routes.json`
- Sample fallback operational status: `data/fallback_status.json`

FAA data describes current airport operational advisories, not every individual flight. Route connections model potential downstream exposure and do not prove that a connected airport or flight is delayed.

## Hub Impact Score

The estimated score is calculated only for disrupted hubs:

```text
hub_impact_score =
  delay_minutes * 0.5 +
  affected_airports_count * 2 +
  hub_connectivity_score * 0.3
```

`affected_airports_count` is the number of locally modeled airports connected to a disrupted hub. `hub_connectivity_score` is the hub's degree in the static route network.

## Deployment

### Render Backend

Create a Render Web Service rooted at `backend/`:

- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/`

Render supplies the `PORT` environment variable automatically.

### GitHub Pages Frontend

Set frontend environment variables before building:

```bash
VITE_API_BASE_URL=https://your-render-service.onrender.com
VITE_BASE_PATH=/your-repository-name/
npm run build
```

Publish `frontend/dist/` to GitHub Pages. The backend enables CORS so the Pages frontend can call the Render API.
