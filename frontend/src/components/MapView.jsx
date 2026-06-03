import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet';

const severityStyles = {
  green: { color: '#45d483', fillColor: '#45d483' },
  yellow: { color: '#f6d365', fillColor: '#f6d365' },
  orange: { color: '#ff9f43', fillColor: '#ff9f43' },
  red: { color: '#ff5d73', fillColor: '#ff5d73' },
};

export default function MapView({ airports, sourceMode, onSelect }) {
  return (
    <div className="map-wrapper">
      <div className="map-overlay">
        <div>
          <span className="section-kicker">Operational map</span>
          <strong>{sourceMode === 'live' ? 'Live Airport Delay Status' : 'Sample Airport Delay Status'}</strong>
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
        {airports.map(airport => (
          <CircleMarker
            key={airport.iata}
            center={[airport.lat, airport.lon]}
            radius={airport.isHub ? 9 : 5}
            pathOptions={{
              ...(severityStyles[airport.severity] || severityStyles.green),
              fillOpacity: airport.isHub ? 0.9 : 0.55,
              weight: airport.isHub ? 2 : 1,
            }}
            eventHandlers={{ click: () => onSelect(airport) }}
          >
            {airport.isHub && <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>{airport.iata}</Tooltip>}
            <Popup>
              <strong>{airport.iata} · {airport.name}</strong><br />
              {airport.disruptionType}<br />
              {airport.delayMinutes ? `${airport.delayMinutes} min reported delay` : 'No reported delay minutes'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
