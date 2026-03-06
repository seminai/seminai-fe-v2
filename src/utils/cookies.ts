/**
 * Classe per la gestione dei cookies
 */
type CookieOptions = {
  days?: number;
  maxAgeSeconds?: number;
};

class CookieService {
  /**
   * Imposta un cookie
   * @param name - Nome del cookie
   * @param value - Valore del cookie
   * @param options - Durata del cookie in giorni o secondi
   */
  setCookie(name: string, value: string, options?: number | CookieOptions): void {
    let expires = "";
    const normalizedOptions =
      typeof options === "number" ? { days: options } : options;

    if (normalizedOptions?.maxAgeSeconds) {
      const date = new Date();
      date.setTime(date.getTime() + normalizedOptions.maxAgeSeconds * 1000);
      expires = `; expires=${date.toUTCString()}`;
    } else if (normalizedOptions?.days) {
      const date = new Date();
      date.setTime(date.getTime() + normalizedOptions.days * 24 * 60 * 60 * 1000);
      expires = `; expires=${date.toUTCString()}`;
    }

    // Aggiungi flag Secure in produzione (richiede HTTPS)
    const isProduction = import.meta.env.PROD;
    const secureFlag = isProduction ? "; Secure" : "";

    const cookieString = `${name}=${encodeURIComponent(
      value || "",
    )}${expires}; path=/; SameSite=Lax${secureFlag}`;

    document.cookie = cookieString;
  }

  /**
   * Ottiene il valore di un cookie
   * @param name - Nome del cookie da leggere
   * @returns Il valore del cookie o null se non esiste
   */
  getCookie(name: string): string | null {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(";");

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const value = c.substring(nameEQ.length, c.length);
        return decodeURIComponent(value);
      }
    }

    return null;
  }

  /**
   * Elimina un cookie
   * @param name - Nome del cookie da eliminare
   */
  deleteCookie(name: string): void {
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
  }
}

const cookieService = new CookieService();
export default cookieService;
