const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");

/**
 * Token in memoria per Socket.IO e altri casi che richiedono accesso diretto al token.
 * NON viene salvato in cookie/localStorage per sicurezza (vulnerabile a XSS).
 * Il token viene impostato solo dalla risposta del login e perso al refresh della pagina.
 * Per l'autenticazione HTTP normale, il backend usa cookie httpOnly.
 */
let inMemoryToken: string | null = null;

/**
 * Classe per la gestione dell'autenticazione
 * 
 * IMPORTANTE: Dopo la migrazione di sicurezza (Gennaio 2025), il token JWT
 * è gestito dal backend tramite cookie httpOnly (non accessibile da JavaScript).
 * 
 * Il frontend:
 * - NON imposta più cookie di autenticazione manualmente
 * - USA credentials: 'include' in tutte le richieste fetch
 * - Mantiene un token in memoria SOLO per Socket.IO
 */
class AuthService {
  /**
   * Imposta il token in memoria (solo per Socket.IO).
   * NON salva in cookie/localStorage per sicurezza.
   * @param token - Il token JWT dalla risposta del login
   * @deprecated Per l'autenticazione HTTP, il backend usa cookie httpOnly.
   *             Questo metodo salva il token solo in memoria per Socket.IO.
   */
  setAuthToken(token: string): void {
    // Salva solo in memoria per Socket.IO, NON in cookie
    inMemoryToken = token;
  }

  /**
   * Ottiene il token dalla memoria (solo per Socket.IO).
   * @returns Il token JWT o null se non presente
   * @deprecated Per l'autenticazione HTTP, usa credentials: 'include'.
   *             Questo metodo è usato solo per Socket.IO.
   */
  getAuthToken(): string | null {
    return inMemoryToken;
  }

  /**
   * Verifica se l'utente potrebbe essere autenticato.
   * NOTA: Con cookie httpOnly, non possiamo verificare il token direttamente.
   * Questo metodo controlla solo se c'è un token in memoria (impostato al login).
   * Per una verifica affidabile, usa l'endpoint /auth/me.
   * 
   * IMPORTANTE: I dati utente NON vengono salvati in cookie per sicurezza (vulnerabile XSS).
   * Usa React Query con /auth/me per ottenere e cachare i dati utente.
   * @returns true se c'è un token in memoria, false altrimenti
   */
  isAuthenticated(): boolean {
    return !!inMemoryToken;
  }

  /**
   * Effettua il logout, invalidando la sessione server-side.
   * Il backend cancella automaticamente il cookie httpOnly.
   */
  async logout(): Promise<void> {
    try {
      const endpoint = API_BASE_URL
        ? `${API_BASE_URL}/auth/logout`
        : "/auth/logout";

      await fetch(endpoint, {
        method: "POST",
        credentials: "include", // Il backend cancella il cookie httpOnly
      });
    } catch {
      // Errore silenzioso - procediamo con la pulizia locale
    } finally {
      // Pulisci token dalla memoria
      inMemoryToken = null;
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
    } catch {
      return null;
    }
  }

  /**
   * Verifica se il token in memoria è scaduto.
   * NOTA: Usato solo per Socket.IO. Per HTTP, il backend gestisce la scadenza.
   * @returns true se il token è scaduto o non presente, false altrimenti
   */
  isTokenExpired(): boolean {
    const token = inMemoryToken;
    if (!token) return true;

    const decodedToken = this.decodeToken(token);
    if (!decodedToken || !decodedToken.exp) return true;

    // La scadenza del token è in formato Unix timestamp (secondi)
    const expirationTime = decodedToken.exp * 1000; // Converti in millisecondi
    const currentTime = Date.now();

    return currentTime >= expirationTime;
  }

  /**
   * Pulisce il token dalla memoria.
   * Utile quando si rileva che l'autenticazione è fallita.
   */
  clearToken(): void {
    inMemoryToken = null;
  }
}

// Esporta un'istanza singleton del servizio
const authService = new AuthService();
export default authService;

// Esporta le funzioni di utilità per l'accessibilità
export const getAuthToken = authService.getAuthToken.bind(authService);
export const isAuthenticated = authService.isAuthenticated.bind(authService);
export const isTokenExpired = authService.isTokenExpired.bind(authService);
