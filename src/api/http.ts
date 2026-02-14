import authService from "@/utils/auth";

export type HttpHeaders = Record<string, string>;

export interface HttpRequestOptions extends RequestInit {
  headers?: HttpHeaders;
}

/** Flag per evitare cascata: solo la prima 401/461 esegue logout + redirect. */
let isRedirectingToAuth = false;

/**
 * HTTP client che applica automaticamente i cookie di sessione
 * e forza il logout in caso di risposta non autorizzata.
 * 
 * IMPORTANTE: Dopo la migrazione di sicurezza (Gennaio 2025):
 * - L'autenticazione avviene tramite cookie httpOnly impostato dal backend
 * - Il frontend usa SOLO credentials: 'include' per inviare il cookie
 * - NON inviamo più l'header Authorization (vulnerabile a XSS)
 */
export class AuthenticatedHttpClient {
  public async request(
    input: RequestInfo | URL,
    options: HttpRequestOptions = {}
  ): Promise<Response> {
    const headers: HttpHeaders = {
      ...(options.headers ?? {}),
    };

    // In produzione (cross-origin), i cookie third-party sono bloccati.
    // Inviamo il token come Bearer header quando disponibile.
    const token = authService.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(input, {
      ...options,
      credentials: "include",
      headers,
    });

    const isUnauthorized =
      response.status === 401 || response.status === 461;

    if (isUnauthorized) {
      const isOnAuthPage =
        typeof window !== "undefined" &&
        (window.location.pathname === "/auth" ||
          window.location.pathname.startsWith("/auth/"));

      if (!isOnAuthPage && !isRedirectingToAuth) {
        isRedirectingToAuth = true;
        await authService.logout();
        window.location.replace("/auth?reason=session_expired");
      }
      throw new Error("Unauthorized");
    }

    return response;
  }
}

export const authenticatedHttpClient = new AuthenticatedHttpClient();
