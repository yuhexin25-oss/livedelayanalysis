import { useMemo } from 'react';
import { scalePoint } from 'd3';

const colors = {
  green: '#45d483',
  yellow: '#f6d365',
  orange: '#ff9f43',
  red: '#ff5d73',
};

export default function NetworkView({ hubs, airports, selectedAirport, onSelect }) {
  const graph = useMemo(() => {
    const selectedHub = hubs.find(hub => hub.iata === selectedAirport?.iata)
      || hubs.find(hub => hub.isDisrupted)
      || hubs[0]
      || null;
    if (!selectedHub) return { hub: null, nodes: [] };

    const airportByCode = new Map(airports.map(airport => [airport.iata, airport]));
    const neighbors = selectedHub.connectedAirports.slice(0, 10);
    const yScale = scalePoint().domain(neighbors.map(item => item.iata)).range([42, 318]).padding(0.25);
    const nodes = neighbors.map(neighbor => ({
      ...(airportByCode.get(neighbor.iata) || neighbor),
      x: 430,
      y: yScale(neighbor.iata),
    }));
    return { hub: { ...selectedHub, x: 118, y: 180 }, nodes };
  }, [hubs, airports, selectedAirport]);

  return (
    <div>
      <div className="section-heading">
        <div>
          <span className="section-kicker">Static route connections</span>
          <h2>Hub Network Analysis</h2>
        </div>
        {graph.hub && <span className="count-badge">{graph.hub.iata} focus</span>}
      </div>
      {!graph.hub ? (
        <p className="no-data">No hub network paths are available yet.</p>
      ) : (
        <>
          <svg className="network-svg" viewBox="0 0 560 360" role="img" aria-label={`${graph.hub.iata} connected airport network`}>
            {graph.nodes.map(node => (
              <line key={`edge-${node.iata}`} x1={graph.hub.x} y1={graph.hub.y} x2={node.x} y2={node.y} className="edge-line" />
            ))}
            <g onClick={() => onSelect(graph.hub)} className="network-node">
              <circle cx={graph.hub.x} cy={graph.hub.y} r="34" fill={colors[graph.hub.severity]} className="hub-ring" />
              <text x={graph.hub.x} y={graph.hub.y + 5} textAnchor="middle" className="node-code dark-code">{graph.hub.iata}</text>
              <text x={graph.hub.x} y={graph.hub.y + 56} textAnchor="middle" className="node-caption">{graph.hub.hubImpactClassification || graph.hub.operationalStatus}</text>
            </g>
            {graph.nodes.map(node => (
              <g key={node.iata} onClick={() => onSelect(node)} className="network-node">
                <circle cx={node.x} cy={node.y} r="13" fill={colors[node.severity] || colors.green} className="node-circle" />
                <text x={node.x + 23} y={node.y + 4} className="node-code">{node.iata}</text>
              </g>
            ))}
          </svg>
          <p className="network-examples">
            {graph.nodes.slice(0, 4).map(node => `${graph.hub.iata} → ${node.iata}`).join('   ')}
          </p>
          <p className="panel-footnote">
            Estimated propagation network based on static route connectivity. Links show potential downstream exposure,
            not confirmed flight delays or exact predictions.
          </p>
        </>
      )}
    </div>
  );
}
