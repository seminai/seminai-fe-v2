import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon as LeafletPolygon,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import {
  ESRI_IMAGERY_URL,
  ESRI_IMAGERY_ATTRIBUTION,
  ESRI_REFERENCE_URL,
  ESRI_REFERENCE_ATTRIBUTION,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  FIELD_ZOOM,
} from "@/utils/map-config";
import { MapLocationSearch } from "./MapLocationSearch";
import {
  isGeoJsonPolygon,
  computePolygonCentroid,
  latLngsToGeoJsonPolygon,
  type GeoJsonPolygon,
} from "@/utils/geo-utils";

/* ------------------------------------------------------------------ */
/*  Small child components (must live inside <MapContainer>)          */
/* ------------------------------------------------------------------ */

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
  }, [map, positions]);
  return null;
}

function SetCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function RemoveAttribution() {
  const map = useMap();
  useEffect(() => {
    if (map.attributionControl) {
      map.removeControl(map.attributionControl);
    }
  }, [map]);
  return null;
}

/** Captures the map instance and passes it to a parent callback. */
function MapRefCapture({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
}

/** Locks or unlocks all map interactions. */
function MapInteractionLock({ locked }: { locked: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (locked) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [map, locked]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Draw control – imperative leaflet-draw integration                */
/* ------------------------------------------------------------------ */

interface DrawControlProps {
  readonly hasPolygon: boolean;
  readonly existingPositions: [number, number][] | null;
  readonly onPolygonChange: (
    polygon: GeoJsonPolygon,
    centroid: { latitude: number; longitude: number },
  ) => void;
}

function DrawControl({ hasPolygon, existingPositions, onPolygonChange }: DrawControlProps) {
  const map = useMap();
  const featureGroupRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  const handleChange = useCallback(
    (latLngs: L.LatLng[]) => {
      const geoJson = latLngsToGeoJsonPolygon(latLngs);
      const centroid = computePolygonCentroid(geoJson.coordinates[0]);
      onPolygonChange(geoJson, centroid);
    },
    [onPolygonChange],
  );

  useEffect(() => {
    const fg = featureGroupRef.current;
    map.addLayer(fg);
    fg.clearLayers();

    // Add existing polygon as editable layer
    if (existingPositions && existingPositions.length > 0) {
      const poly = L.polygon(existingPositions, {
        color: "#22c55e",
        weight: 2,
        fillOpacity: 0.2,
      });
      fg.addLayer(poly);
    }

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: hasPolygon
          ? false
          : { shapeOptions: { color: "#22c55e", weight: 2, fillOpacity: 0.2 } },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: hasPolygon
        ? { featureGroup: fg, remove: false }
        : { featureGroup: fg, edit: false, remove: false },
    });

    drawControlRef.current = drawControl;
    map.addControl(drawControl);

    const onCreated = (e: L.DrawEvents.Created) => {
      fg.clearLayers();
      fg.addLayer(e.layer);
      const latLngs = (e.layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
      handleChange(latLngs);
    };

    const onEdited = (e: L.DrawEvents.Edited) => {
      e.layers.eachLayer((layer) => {
        const latLngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
        handleChange(latLngs);
      });
    };

    map.on(L.Draw.Event.CREATED, onCreated as L.LeafletEventHandlerFn);
    map.on(L.Draw.Event.EDITED, onEdited as L.LeafletEventHandlerFn);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated as L.LeafletEventHandlerFn);
      map.off(L.Draw.Event.EDITED, onEdited as L.LeafletEventHandlerFn);
      map.removeControl(drawControl);
      map.removeLayer(fg);
    };
  }, [map, hasPolygon, existingPositions, handleChange]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Marker icon                                                       */
/* ------------------------------------------------------------------ */

function createFieldMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "field-polygon-marker",
    html: `<div style="
      width: 20px; height: 20px; border-radius: 50%;
      background: #22c55e; border: 3px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export interface FieldPolygonMapProps {
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly polygon: Record<string, unknown> | unknown[] | null;
  readonly isEditing: boolean;
  readonly onPolygonChange: (
    polygon: GeoJsonPolygon,
    centroid: { latitude: number; longitude: number },
  ) => void;
}

export function FieldPolygonMap({
  latitude,
  longitude,
  polygon,
  isEditing,
  onPolygonChange,
}: FieldPolygonMapProps) {
  const parsedPolygon = useMemo(
    () => (isGeoJsonPolygon(polygon) ? polygon : null),
    [polygon],
  );

  const polygonPositions = useMemo<[number, number][] | null>(() => {
    if (!parsedPolygon) return null;
    const positions = parsedPolygon.coordinates[0].map(
      (coord) => [coord[1], coord[0]] as [number, number],
    );
    return positions.length >= 3 ? positions : null;
  }, [parsedPolygon]);

  const hasCoordinates = latitude != null && longitude != null;
  const hasPolygon = polygonPositions !== null;

  const center = useMemo<[number, number]>(() => {
    if (hasCoordinates) return [latitude, longitude];
    return DEFAULT_CENTER;
  }, [latitude, longitude, hasCoordinates]);

  const zoom = hasCoordinates || hasPolygon ? FIELD_ZOOM : DEFAULT_ZOOM;
  const markerIcon = useMemo(createFieldMarkerIcon, []);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  return (
    <div className="space-y-2">
      {isEditing && <MapLocationSearch mapRef={mapInstance} />}
      <div className="field-polygon-map-wrapper overflow-hidden rounded-lg border border-border">
        <style>{`.field-polygon-map-wrapper .leaflet-control-attribution { display: none !important; }`}</style>
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-[280px] w-full z-0"
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <MapRefCapture onMap={setMapInstance} />
          <MapInteractionLock locked={!isEditing} />
          <TileLayer url={ESRI_IMAGERY_URL} attribution={ESRI_IMAGERY_ATTRIBUTION} />
          <TileLayer url={ESRI_REFERENCE_URL} attribution={ESRI_REFERENCE_ATTRIBUTION} zIndex={1} />
          <RemoveAttribution />

        {polygonPositions && <FitBounds positions={polygonPositions} />}
        {!hasPolygon && hasCoordinates && <SetCenter center={center} zoom={zoom} />}
        {!hasPolygon && !hasCoordinates && <SetCenter center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} />}

        {/* View mode: show polygon or marker */}
        {polygonPositions && !isEditing && (
          <LeafletPolygon
            positions={polygonPositions}
            pathOptions={{ color: "#22c55e", weight: 2, fillOpacity: 0.2 }}
          />
        )}
        {!hasPolygon && hasCoordinates && !isEditing && (
          <Marker position={[latitude, longitude]} icon={markerIcon} />
        )}

        {/* Edit mode: draw/edit controls */}
        {isEditing && (
          <DrawControl
            hasPolygon={hasPolygon}
            existingPositions={polygonPositions}
            onPolygonChange={onPolygonChange}
          />
        )}
        </MapContainer>
      </div>
    </div>
  );
}
