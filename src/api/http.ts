import authService from "@/utils/auth";

export type HttpHeaders = Record<string, string>;

export interface HttpRequestOptions extends RequestInit {
  headers?: HttpHeaders;
}

/**
 * HTTP client che applica automaticamente i cookie di sessione
 * e forza il logout in caso di risposta non autorizzata.
 */
export class AuthenticatedHttpClient {
  public async request(
    input: RequestInfo | URL,
    options: HttpRequestOptions = {}
  ): Promise<Response> {
    const response = await fetch(input, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers ?? {}),
      },
    });

    if (response.status === 401) {
      await authService.logout();
      throw new Error("Unauthorized");
    }

    return response;
  }
}

export const authenticatedHttpClient = new AuthenticatedHttpClient();
