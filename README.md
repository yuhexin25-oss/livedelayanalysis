# Hub Resilience Monitor

Hub Resilience Monitor is a real-time U.S. airport delay and hub disruption dashboard. It combines FAA airport-level operational advisories with a static local route network to estimate how disruptions at major hubs may affect connected airports.

**Live dashboard:** <https://yuhexin25-oss.github.io/livedelayanalysis/>

The dashboard is explicit about provenance:

- **Live FAA airport status** is fetched from the FAA every five minutes.
- **Static route network data** is stored locally in `data/`.
- **Hub Impact Score** is an estimate, not an FAA metric or a confirmed flight-delay forecast.
- **Fallback status data** is clearly labeled as sample data and is never presented as live.

GitHub Pages hosts only the static React frontend. It does not run the Node.js/Express backend. Without a separately deployed backend URL, the dashboard automatically operates in clearly labeled sample data mode.

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
backend/data/  Static data bundled with the Render backend
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
- `GET /api/health` JSON health and latest FAA source metadata
- `GET /api/status` normalized dashboard JSON

All backend routes, including errors and unknown routes, return JSON rather than HTML.

For development with automatic restarts:

```bash
npm run dev
```

## Run the Frontend

```bash
cd frontend
npm run dev
```

Vite runs at `http://localhost:5173`. To connect it to a local or deployed backend, create `frontend/.env.local`:

```text
VITE_API_BASE_URL=http://localhost:3000
```

If `VITE_API_BASE_URL` is empty, invalid, unavailable, or returns non-JSON content, the frontend loads its local sample data instead of making a relative backend request.

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
- GitHub Pages frontend fallback assets: `frontend/public/data/`

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

GitHub Pages cannot run the backend. Deploy `backend/` separately on Render, Railway, or another Node.js hosting service. For Render, create a Web Service rooted at `backend/`:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Render supplies the `PORT` environment variable automatically.

The repository also includes `render.yaml` for a Render Blueprint named `livedelayanalysis-backend`. The backend allows browser requests from:

```text
https://yuhexin25-oss.github.io
```

To create the service from the Blueprint:

1. Open the Render Dashboard.
2. Select `New → Blueprint`.
3. Connect the `yuhexin25-oss/livedelayanalysis` repository.
4. Keep the Blueprint path as `render.yaml` and deploy the Blueprint.

After Render deploys the service, verify that these URLs return JSON:

```text
https://livedelayanalysis-backend.onrender.com/api/health
https://livedelayanalysis-backend.onrender.com/api/status
```

### GitHub Pages Frontend

The repository includes `.github/workflows/deploy.yml`, which builds the app inside `frontend/` and deploys only `frontend/dist/` to GitHub Pages. The Vite base path is fixed to `/livedelayanalysis/` so JavaScript, CSS, and other generated asset URLs work at the project Pages URL.

The deployed frontend remains usable without a backend. In that case it loads:

```text
/livedelayanalysis/data/fallback-status.json
/livedelayanalysis/data/airports.json
/livedelayanalysis/data/routes.json
```

and displays `Sample Data Mode` plus `Using sample fallback data — backend not connected`.

In the GitHub repository, change:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

To connect the deployed frontend to the Render backend, add a repository Actions variable:

```text
Settings → Secrets and variables → Actions → Variables → New repository variable
Name: VITE_API_BASE_URL
Value: https://livedelayanalysis-backend.onrender.com
```

The GitHub Pages workflow also sets this backend URL directly while building the frontend. When `/api/status` reports `sourceMode: "live"`, the dashboard badge displays `Live FAA Backend Connected`.
