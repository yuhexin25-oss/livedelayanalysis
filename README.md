# Hub Resilience Monitor

A real-time U.S. airport delay and hub disruption dashboard that combines FAA live airport status data with static route network data.

## Project structure

- `backend/` - Node.js + Express backend fetching FAA airport status and converting XML to JSON.
- `frontend/` - React + Vite dashboard with Leaflet map and delay propagation visualization.
- `data/` - Static airport network data and fallback sample FAA status data.

## Features

- Live FAA airport status poll every 5 minutes
- Converts FAA XML into clean JSON payloads for the frontend
- Dark aviation dashboard user interface
- U.S. airport delay map with hub severity colors
- Top delayed airports panel
- Hub Impact Score and disruption metrics
- Delay propagation network visualization for hub connections
- Airport detail panel when selecting an airport
- Sample fallback data when FAA API is unavailable

## Install

From the repository root, install both backend and frontend dependencies separately:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run backend

```bash
cd backend
npm start
```

The backend listens on port `3000` and exposes `/api/status`.

## Run frontend

```bash
cd frontend
npm run dev
```

The frontend runs on port `5173` and proxies `/api` to the backend.

## Data sources

- Live FAA airport status: `https://nasstatus.faa.gov/api/airport-status-information`
- Static local airport data: `data/airports.json`
- Static local route network data: `data/routes.json`
- Sample fallback FAA status data: `data/fallback_status.json`

## Notes

- The dashboard clearly distinguishes live FAA airport status from local static route network data and estimated impact scores.
- Sample fallback data is used when the FAA API cannot be reached.
- This project is structured to support deployment with a static frontend build and a server backend.
