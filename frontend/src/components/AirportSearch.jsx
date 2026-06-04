import { useMemo, useState } from 'react';

export default function AirportSearch({ airports, onSelect }) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return airports.slice(0, 5);
    return airports
      .filter(airport => (
        airport.iata.toLowerCase().includes(normalized)
        || airport.name.toLowerCase().includes(normalized)
      ))
      .slice(0, 6);
  }, [airports, query]);

  function selectAirport(airport) {
    onSelect(airport);
    setQuery(`${airport.iata} - ${airport.name}`);
  }

  return (
    <div className="search-panel">
      <label htmlFor="airport-search">
        <span className="section-kicker">Airport search</span>
        <input
          id="airport-search"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search ATL, LAX, JFK, SEA, ORD..."
        />
      </label>
      <div className="search-results" role="listbox" aria-label="Airport search results">
        {matches.map(airport => (
          <button key={airport.iata} type="button" onClick={() => selectAirport(airport)}>
            <strong>{airport.iata}</strong>
            <span>{airport.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
