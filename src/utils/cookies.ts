/**
 * Classe per la gestione dei cookies
 */
class CookieService {
  /**
   * Imposta un cookie
   * @param name - Nome del cookie
   * @param value - Valore del cookie
   * @param days - Durata in giorni (opzionale)
   */
  setCookie(name: string, value: string, days?: number): void {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = `; expires=${date.toUTCString()}`;
    }

    // Aggiungi flag Secure in produzione (richiede HTTPS)
    const isProduction = import.meta.env.PROD;
    const secureFlag = isProduction ? "; Secure" : "";

    const cookieString = `${name}=${
      value || ""
    }${expires}; path=/; SameSite=Lax${secureFlag}`;

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
        return value;
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
