import authService from "@/utils/auth";
import { compressJsonBody } from "@/utils/compress";

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

    // Auto-compressione: comprimi body JSON > 1KB con gzip+base64
    let { body } = options;
    if (body && typeof body === "string" && this.isJsonContentType(headers)) {
      const result = compressJsonBody(body);
      if (result.compressed) {
        body = result.body;
        headers["X-Payload-Compressed"] = "gzip";
        headers["X-Original-Size"] = String(result.originalSize);
        headers["X-Compressed-Size"] = String(result.compressedSize);
      }
    }

    const response = await fetch(input, {
      ...options,
      body,
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

  private isJsonContentType(headers: HttpHeaders): boolean {
    const contentType = Object.entries(headers).find(
      ([key]) => key.toLowerCase() === "content-type",
    );
    return contentType
      ? contentType[1].toLowerCase().includes("application/json")
      : false;
  }
}

export const authenticatedHttpClient = new AuthenticatedHttpClient();
