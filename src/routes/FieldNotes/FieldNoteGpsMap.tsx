import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ESRI_IMAGERY_URL,
  ESRI_IMAGERY_ATTRIBUTION,
  ESRI_REFERENCE_URL,
  ESRI_REFERENCE_ATTRIBUTION,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "@/utils/map-config";

/** Custom marker icon (no default Leaflet icons). */
function createMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "field-note-gps-marker",
    html: `<div style="
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #2563eb;
      border: 3px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

interface MapClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

function MapClickHandler({ onLocationSelect }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface SetCenterProps {
  center: [number, number];
  zoom: number;
}

function SetCenter({ center, zoom }: SetCenterProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

/** Removes Leaflet attribution control from the map (header/footer with "Leaflet | Tiles © ..."). */
function RemoveAttribution() {
  const map = useMap();
  useEffect(() => {
    if (map.attributionControl) {
      map.removeControl(map.attributionControl);
    }
  }, [map]);
  return null;
}

export interface FieldNoteGpsMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

export function FieldNoteGpsMap({
  latitude,
  longitude,
  onLocationSelect,
  className = "",
}: FieldNoteGpsMapProps) {
  const center: [number, number] = useMemo(() => {
    if (latitude != null && longitude != null) {
      return [latitude, longitude];
    }
    return DEFAULT_CENTER;
  }, [latitude, longitude]);

  const markerIcon = useMemo(createMarkerIcon, []);
  const zoom = latitude != null && longitude != null ? 14 : DEFAULT_ZOOM;

  return (
    <div
      className={`field-note-gps-map-wrapper overflow-hidden rounded-lg border border-border ${className}`}
    >
      {/* Hide Leaflet attribution (header/footer "Leaflet | Tiles © ...") */}
      <style>{`.field-note-gps-map-wrapper .leaflet-control-attribution { display: none !important; }`}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-[220px] w-full z-0"
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer url={ESRI_IMAGERY_URL} attribution={ESRI_IMAGERY_ATTRIBUTION} />
        <TileLayer
          url={ESRI_REFERENCE_URL}
          attribution={ESRI_REFERENCE_ATTRIBUTION}
          zIndex={1}
        />
        <SetCenter center={center} zoom={zoom} />
        <RemoveAttribution />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        {latitude != null && longitude != null && (
          <Marker position={[latitude, longitude]} icon={markerIcon} />
        )}
      </MapContainer>
    </div>
  );
}
