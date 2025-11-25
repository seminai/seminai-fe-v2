import cookieService from "./cookies";
import type { User } from "@/api/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");

// Nomi dei cookies
// Nota: il token leggibile dal client usa un nome diverso dall'httpOnly del server
// per evitare conflitti (un cookie httpOnly con lo stesso nome non è sovrascrivibile da JS)
const TOKEN_COOKIE_NAME = "auth_bearer";
const TOKEN_COOKIE_NAME_BE = "auth_token";
const USER_COOKIE_NAME = "user_data";

// Durata del cookie in giorni
const COOKIE_DURATION = 7; // 1 settimana

/**
 * Classe per la gestione dell'autenticazione
 */
class AuthService {
  /**
   * Imposta il token di autenticazione nel cookie
   * @param token - Il token JWT
   */
  setAuthToken(token: string): void {
    cookieService.setCookie(TOKEN_COOKIE_NAME, token, COOKIE_DURATION);
  }

  /**
   * Ottiene il token di autenticazione dal cookie
   * @returns Il token JWT o null se non presente
   */
  getAuthToken(): string | null {
    return cookieService.getCookie(TOKEN_COOKIE_NAME);
  }

  /**
   * Salva i dati dell'utente nel cookie
   * @param user - I dati dell'utente
   */
  setUserData(user: User): void {
    try {
      const userString = JSON.stringify(user);
      cookieService.setCookie(USER_COOKIE_NAME, userString, COOKIE_DURATION);
    } catch (error: unknown) {
      console.error("Errore durante il salvataggio dei dati utente:", error);
    }
  }

  /**
   * Ottiene i dati dell'utente dal cookie
   * @returns I dati dell'utente o null se non presenti
   */
  getUserData<T = User>(): T | null {
    try {
      const userString = cookieService.getCookie(USER_COOKIE_NAME);
      if (!userString) return null;
      return JSON.parse(userString) as T;
    } catch (error: unknown) {
      console.error("Errore durante il recupero dei dati utente:", error);
      return null;
    }
  }

  /**
   * Verifica se l'utente è autenticato
   * @returns true se l'utente è autenticato, false altrimenti
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Effettua il logout, invalidando la sessione server-side e rimuovendo tutti i cookies relativi all'autenticazione
   */
  async logout(): Promise<void> {
    try {
      const endpoint = API_BASE_URL
        ? `${API_BASE_URL}/auth/logout`
        : "/auth/logout";

      await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Errore durante il logout server-side:", error);
    } finally {
      cookieService.deleteCookie(TOKEN_COOKIE_NAME);
      cookieService.deleteCookie(TOKEN_COOKIE_NAME_BE);
      cookieService.deleteCookie(USER_COOKIE_NAME);
    }
  }

  /**
   * Decodifica un token JWT e restituisce il payload
   * @param token Il token JWT da decodificare
   * @returns Il payload del token o null se non valido
   */
  decodeToken(token: string): { exp?: number } | null {
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) return null;

      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch (error: unknown) {
      console.error("Errore durante la decodifica del token:", error);
      return null;
    }
  }

  /**
   * Verifica se il token è scaduto
   * @returns true se il token è scaduto, false altrimenti
   */
  isTokenExpired(): boolean {
    const token = this.getAuthToken();
    if (!token) return true;

    const decodedToken = this.decodeToken(token);
    if (!decodedToken || !decodedToken.exp) return true;

    // La scadenza del token è in formato Unix timestamp (secondi)
    const expirationTime = decodedToken.exp * 1000; // Converti in millisecondi
    const currentTime = Date.now();

    return currentTime >= expirationTime;
  }
}

// Esporta un'istanza singleton del servizio
const authService = new AuthService();
export default authService;

// Esporta le funzioni di utilità per l'accessibilità
export const getAuthToken = authService.getAuthToken.bind(authService);
export const getUserData = authService.getUserData.bind(authService);
export const isAuthenticated = authService.isAuthenticated.bind(authService);
export const isTokenExpired = authService.isTokenExpired.bind(authService);
