import { useState, useRef, useCallback, useEffect } from "react";
import type L from "leaflet";
import { Search, X, Loader2 } from "lucide-react";

interface NominatimResult {
  readonly place_id: number;
  readonly display_name: string;
  readonly lat: string;
  readonly lon: string;
  readonly boundingbox: readonly string[];
}

interface MapLocationSearchProps {
  readonly mapRef: L.Map | null;
}

/**
 * Geocoding search overlay for Leaflet maps.
 * Uses Nominatim (OpenStreetMap) for location lookup.
 * Rendered outside MapContainer – receives the map instance via prop.
 */
export function MapLocationSearch({ mapRef }: MapLocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchNominatim = useCallback(async (text: string) => {
    if (text.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        q: text,
        format: "json",
        limit: "5",
        countrycodes: "it",
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { "Accept-Language": "it" } },
      );
      if (!response.ok) return;
      const data = (await response.json()) as NominatimResult[];
      setResults(data);
      setShowResults(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchNominatim(value), 500);
    },
    [searchNominatim],
  );

  const handleSelect = useCallback(
    (result: NominatimResult) => {
      if (!mapRef) return;
      const [south, north, west, east] = result.boundingbox.map(Number);
      mapRef.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { maxZoom: 17, padding: [20, 20] },
      );
      setQuery(result.display_name.split(",")[0]);
      setShowResults(false);
      setResults([]);
    },
    [mapRef],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  }, []);

  // Close results on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Cerca località..."
          className="w-full h-8 pl-7 pr-8 text-xs rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
        />
        {isSearching && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />
        )}
        {!isSearching && query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {results.map((result) => (
            <li key={result.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-green-50 hover:text-green-800 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
