import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const severityStyles = {
  green: { color: '#4caf50', fillColor: '#4caf50' },
  yellow: { color: '#f5c332', fillColor: '#f5c332' },
  orange: { color: '#f08a24', fillColor: '#f08a24' },
  red: { color: '#e64545', fillColor: '#e64545' },
};

export default function MapView({ airports, hubs, onSelect }) {
  const markers = hubs.map(hub => {
    const airport = airports.find(a => a.iata === hub.iata);
    return {
      ...hub,
      lat: airport?.lat ?? 37.0902,
      lon: airport?.lon ?? -95.7129,
    };
  });

  return (
    <div className="map-wrapper">
      <div className="map-overlay">
        <strong>Live Delay Map</strong>
        <div className="legend">
          <span className="legend-chip"><span className="legend-swatch swatch-green" />Normal</span>
          <span className="legend-chip"><span className="legend-swatch swatch-yellow" />Minor</span>
          <span className="legend-chip"><span className="legend-swatch swatch-orange" />Moderate</span>
          <span className="legend-chip"><span className="legend-swatch swatch-red" />Severe</span>
        </div>
      </div>
      <MapContainer center={[39.8283, -98.5795]} zoom={4} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map(marker => (
          <CircleMarker
            key={marker.iata}
            center={[marker.lat, marker.lon]}
            radius={10}
            pathOptions={severityStyles[marker.severity] || severityStyles.green}
            eventHandlers={{ click: () => onSelect(marker) }}
          >
            <Popup>
              <strong>{marker.iata}</strong><br />
              {marker.name}<br />
              {marker.disruptionType} · {marker.delayMinutes} min<br />
              Impact {marker.hubImpactScore}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
