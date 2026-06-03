import { useMemo } from 'react';

const colors = {
  green: '#4caf50',
  yellow: '#f5c332',
  orange: '#f08a24',
  red: '#e64545',
};

export default function NetworkView({ hubs, routes, onSelect }) {
  const graph = useMemo(() => {
    const disruptedHubs = hubs.filter(hub => hub.isDisrupted).slice(0, 5);
    const nodes = disruptedHubs.map((hub, index) => ({ ...hub, x: 120, y: 80 + index * 100 }));
    const connectedNodes = [];
    const edges = [];
    disruptedHubs.forEach((hub, index) => {
      const neighbors = routes
        .filter(route => route.origin === hub.iata || route.destination === hub.iata)
        .map(route => (route.origin === hub.iata ? route.destination : route.origin));
      neighbors.slice(0, 3).forEach((code, idx) => {
        const target = {
          iata: code,
          name: code,
          x: 320 + idx * 120,
          y: 60 + index * 120,
          severity: 'green',
          disruptionType: 'Connected airport',
          delayMinutes: 0,
          hubConnectivityScore: 0,
          hubImpactScore: 0,
          status: 'Static route network',
        };
        connectedNodes.push(target);
        edges.push({ source: hub, target });
      });
    });
    return { nodes: [...nodes, ...connectedNodes], edges };
  }, [hubs, routes]);

  if (!hubs || hubs.length === 0) {
    return <p className="no-data">Delay propagation network is unavailable.</p>;
  }

  if (graph.edges.length === 0) {
    return <p className="no-data">No disrupted hub network paths detected right now.</p>;
  }

  return (
    <div>
      <h2 className="section-title">Delay Propagation Network</h2>
      <svg className="network-svg" viewBox="0 0 560 360">
        {graph.edges.map((edge, index) => (
          <line
            key={`edge-${index}`}
            x1={edge.source.x}
            y1={edge.source.y}
            x2={edge.target.x}
            y2={edge.target.y}
            className="edge-line"
          />
        ))}
        {graph.nodes.map((node, index) => (
          <g key={`node-${index}`} onClick={() => onSelect(node)} style={{ cursor: 'pointer' }}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.isDisrupted ? 18 : 12}
              fill={colors[node.severity] || '#4caf50'}
              className="node-circle"
            />
            <text x={node.x + 24} y={node.y + 4} fill="#dbe7ff" fontSize="12">
              {node.iata}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
