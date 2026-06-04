import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardData, parseFaaStatusXml } from '../services/statusService.js';

const xml = `
<AIRPORT_STATUS_INFORMATION>
  <Update_Time>Wed Jun 3 02:54:34 2026 GMT</Update_Time>
  <Delay_type>
    <Name>General Arrival/Departure Delay Info</Name>
    <Arrival_Departure_Delay_List>
      <Delay>
        <ARPT>DFW</ARPT>
        <Reason>WX:Thunderstorms</Reason>
        <Arrival_Departure Type="Departure">
          <Min>16 minutes</Min><Max>30 minutes</Max><Trend>Increasing</Trend>
        </Arrival_Departure>
      </Delay>
    </Arrival_Departure_Delay_List>
  </Delay_type>
  <Delay_type>
    <Name>Airport Closures</Name>
    <Airport_Closure_List>
      <Airport><ARPT>LAX</ARPT><Reason>Airport closed</Reason></Airport>
    </Airport_Closure_List>
  </Delay_type>
</AIRPORT_STATUS_INFORMATION>`;

test('parses FAA category-based XML into normalized airport status records', async () => {
  const parsed = await parseFaaStatusXml(xml);
  assert.equal(parsed.faaUpdatedAt, 'Wed Jun 3 02:54:34 2026 GMT');
  assert.deepEqual(parsed.statuses.find(item => item.airportCode === 'DFW').delayRange, { min: 16, max: 30 });
  assert.equal(parsed.statuses.find(item => item.airportCode === 'DFW').weatherDelay, true);
  assert.equal(parsed.statuses.find(item => item.airportCode === 'LAX').faaClosureAdvisory, true);
  assert.equal(parsed.statuses.find(item => item.airportCode === 'LAX').closure, false);
});

test('only assigns downstream impact to disrupted hubs', async () => {
  const data = await buildDashboardData({
    airports: [
      { iata: 'ATL', name: 'Atlanta', lat: 1, lon: 1 },
      { iata: 'BOS', name: 'Boston', lat: 2, lon: 2 },
    ],
    routes: [{ origin: 'ATL', destination: 'BOS' }],
    statuses: [],
    sourceMode: 'live',
    sourceLabel: 'Live FAA airport status',
    faaUpdatedAt: null,
    fetchedAt: null,
  });

  const atl = data.hubs.find(hub => hub.iata === 'ATL');
  assert.equal(atl.affectedAirportsCount, 0);
  assert.equal(atl.hubImpactScore > 0, true);
  assert.equal(atl.hubConnectivityScore, 1);
});
