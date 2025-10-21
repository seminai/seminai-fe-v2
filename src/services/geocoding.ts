/**
 * Servizio per la gestione del geocoding e reverse geocoding
 * Utilizza OpenStreetMap Nominatim API (gratuito e senza API key)
 */

export interface AddressInfo {
  comune: string;
  cap?: string;
  frazione?: string;
  indirizzo?: string;
  provincia?: string;
  regione?: string;
}

export interface CoordinatesInfo {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  coordinates: CoordinatesInfo;
  address: AddressInfo;
  confidence: number; // 0-1, dove 1 è massima confidenza
}

// Interfacce per i dati OSM
interface OSMAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  postcode?: string;
  suburb?: string;
  hamlet?: string;
  neighbourhood?: string;
  road?: string;
  house_number?: string;
  state?: string;
  province?: string;
}

interface OSMSearchResult {
  lat: string;
  lon: string;
  address?: OSMAddress;
  importance?: string;
  display_name: string;
}

interface OSMReverseResult {
  address: OSMAddress;
}

export class GeocodingService {
  private static readonly BASE_URL = "https://nominatim.openstreetmap.org";
  private static readonly USER_AGENT = "SeminAI-App/1.0";

  /**
   * Converte un indirizzo in coordinate geografiche
   */
  static async getCoordinatesFromAddress(
    comune: string,
    cap?: string,
    frazione?: string,
    indirizzo?: string
  ): Promise<GeocodingResult | null> {
    try {
      // Costruisce la query di ricerca
      const addressParts = [indirizzo, frazione, comune, cap, "Italy"].filter(
        Boolean
      );

      const query = addressParts.join(", ");

      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: "1",
        countrycodes: "IT",
        "accept-language": "it",
      });

      const response = await fetch(`${this.BASE_URL}/search?${params}`, {
        headers: {
          "User-Agent": this.USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OSMSearchResult[] = await response.json();

      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];

      return {
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        },
        address: {
          comune:
            result.address?.city ||
            result.address?.town ||
            result.address?.village ||
            comune,
          cap: result.address?.postcode || cap,
          frazione:
            result.address?.suburb || result.address?.hamlet || frazione,
          indirizzo: result.address?.road || indirizzo,
          provincia: result.address?.state || result.address?.province,
          regione: result.address?.state,
        },
        confidence: parseFloat(result.importance || "0.5"),
      };
    } catch (error) {
      console.error("Errore nel geocoding:", error);
      return null;
    }
  }

  /**
   * Converte coordinate geografiche in informazioni di indirizzo
   */
  static async getAddressFromCoordinates(
    lat: number,
    lng: number
  ): Promise<AddressInfo | null> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: "json",
        addressdetails: "1",
        "accept-language": "it",
      });

      const response = await fetch(`${this.BASE_URL}/reverse?${params}`, {
        headers: {
          "User-Agent": this.USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OSMReverseResult = await response.json();

      if (!data || !data.address) {
        return null;
      }

      const address = data.address;

      return {
        comune:
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          "Non disponibile",
        cap: address.postcode || undefined,
        frazione:
          address.suburb ||
          address.hamlet ||
          address.neighbourhood ||
          undefined,
        indirizzo: this.formatAddress(address),
        provincia: address.state || address.province || undefined,
        regione: address.state || undefined,
      };
    } catch (error) {
      console.error("Errore nel reverse geocoding:", error);
      return null;
    }
  }

  /**
   * Ottiene informazioni di indirizzo dal centro geometrico di un campo
   */
  static async getAddressFromFieldCoordinates(
    coordinates: number[]
  ): Promise<AddressInfo | null> {
    if (coordinates.length < 2) {
      return null;
    }

    // Calcola il centro del poligono
    const center = this.calculatePolygonCenter(coordinates);

    return this.getAddressFromCoordinates(center.lat, center.lng);
  }

  /**
   * Calcola il centro geometrico di un poligono
   */
  private static calculatePolygonCenter(
    coordinates: number[]
  ): CoordinatesInfo {
    if (coordinates.length < 2) {
      return { lat: 0, lng: 0 };
    }

    let totalLat = 0;
    let totalLng = 0;
    let pointCount = 0;

    // Itera attraverso le coordinate a coppie (lat, lng)
    for (let i = 0; i < coordinates.length; i += 2) {
      if (i + 1 < coordinates.length) {
        totalLat += coordinates[i];
        totalLng += coordinates[i + 1];
        pointCount++;
      }
    }

    return {
      lat: totalLat / pointCount,
      lng: totalLng / pointCount,
    };
  }

  /**
   * Formatta l'indirizzo da componenti OSM
   */
  private static formatAddress(address: OSMAddress): string | undefined {
    const parts = [address.road, address.house_number].filter(Boolean);

    return parts.length > 0 ? parts.join(" ") : undefined;
  }

  /**
   * Valida se le coordinate sono valide per l'Italia
   */
  static isValidItalianCoordinates(lat: number, lng: number): boolean {
    // Approssimative coordinate dell'Italia
    const italyBounds = {
      north: 47.0,
      south: 36.0,
      east: 18.5,
      west: 6.0,
    };

    return (
      lat >= italyBounds.south &&
      lat <= italyBounds.north &&
      lng >= italyBounds.west &&
      lng <= italyBounds.east
    );
  }

  /**
   * Cerca comuni italiani per nome parziale
   */
  static async searchItalianCities(query: string): Promise<AddressInfo[]> {
    if (query.length < 2) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: `${query}, Italy`,
        format: "json",
        addressdetails: "1",
        limit: "10",
        countrycodes: "IT",
        "accept-language": "it",
        featuretype: "city",
      });

      const response = await fetch(`${this.BASE_URL}/search?${params}`, {
        headers: {
          "User-Agent": this.USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OSMSearchResult[] = await response.json();

      return data.map((item: OSMSearchResult) => ({
        comune:
          item.address?.city ||
          item.address?.town ||
          item.address?.village ||
          item.display_name.split(",")[0],
        cap: item.address?.postcode,
        provincia: item.address?.state || item.address?.province,
        regione: item.address?.state,
      }));
    } catch (error) {
      console.error("Errore nella ricerca delle città:", error);
      return [];
    }
  }
}
