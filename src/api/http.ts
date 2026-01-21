import authService from "@/utils/auth";

export type HttpHeaders = Record<string, string>;

export interface HttpRequestOptions extends RequestInit {
  headers?: HttpHeaders;
}

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

    // Il cookie httpOnly viene inviato automaticamente con credentials: 'include'
    // Non serve più impostare l'header Authorization

    const response = await fetch(input, {
      ...options,
      credentials: "include", // IMPORTANTE: Invia cookie httpOnly automaticamente
      headers,
    });

    if (response.status === 401) {
      await authService.logout();
      throw new Error("Unauthorized");
    }

    return response;
  }
}

export const authenticatedHttpClient = new AuthenticatedHttpClient();
