import { useEffect } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';

const severityStyles = {
  green: { color: '#45d483', fillColor: '#45d483' },
  yellow: { color: '#f6d365', fillColor: '#f6d365' },
  orange: { color: '#ff9f43', fillColor: '#ff9f43' },
  red: { color: '#ff5d73', fillColor: '#ff5d73' },
};

function MapFocus({ selectedAirport }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedAirport?.lat || !selectedAirport?.lon) return;
    map.flyTo([selectedAirport.lat, selectedAirport.lon], Math.max(map.getZoom(), 6), {
      animate: true,
      duration: 0.9,
    });
  }, [map, selectedAirport]);

  return null;
}

export default function MapView({ airports, selectedAirport, sourceMode, onSelect }) {
  return (
    <div className="map-wrapper">
      <div className="map-overlay">
        <div>
          <span className="section-kicker">Operational map</span>
          <strong>{sourceMode === 'live' ? 'Live Airport Operational Risk' : 'Sample Airport Operational Risk'}</strong>
        </div>
        <div className="legend">
          <span><i className="legend-swatch swatch-green" />Normal</span>
          <span><i className="legend-swatch swatch-yellow" />Minor</span>
          <span><i className="legend-swatch swatch-orange" />Moderate</span>
          <span><i className="legend-swatch swatch-red" />Severe</span>
        </div>
      </div>
      <MapContainer center={[38.6, -97.5]} zoom={4} minZoom={3} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapFocus selectedAirport={selectedAirport} />
        {airports.map(airport => (
          <CircleMarker
            key={airport.iata}
            center={[airport.lat, airport.lon]}
            radius={selectedAirport?.iata === airport.iata ? 15 : airport.isHub ? 9 : 5}
            pathOptions={{
              ...(severityStyles[airport.severity] || severityStyles.green),
              fillOpacity: airport.isHub ? 0.9 : 0.55,
              weight: selectedAirport?.iata === airport.iata ? 4 : airport.isHub ? 2 : 1,
              opacity: 1,
            }}
            eventHandlers={{ click: () => onSelect(airport) }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="airport-tooltip" sticky>
              {airport.iata} · {airport.name} · {airport.operationalStatus || airport.disruptionType}
            </Tooltip>
            <Popup>
              <strong>{airport.iata} · {airport.name}</strong><br />
              {airport.operationalStatus || airport.disruptionType}<br />
              Departure: {airport.departureDelayMinutes || 0} min · Arrival: {airport.arrivalDelayMinutes || 0} min<br />
              FAA advisory: {airport.faaStatus || airport.status || 'No active advisory'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
