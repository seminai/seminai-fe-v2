/** Shared map tile layer configuration for Leaflet-based components. */

export const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export const ESRI_IMAGERY_ATTRIBUTION =
  "Tiles &copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

export const ESRI_REFERENCE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}";

export const ESRI_REFERENCE_ATTRIBUTION = "Tiles &copy; Esri";

/** Default center: central Italy. */
export const DEFAULT_CENTER: [number, number] = [41.9, 12.5];

/** Zoom level for country-wide view. */
export const DEFAULT_ZOOM = 6;

/** Zoom level for a single field. */
export const FIELD_ZOOM = 16;
