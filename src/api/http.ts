export type HttpHeaders = Record<string, string>;

export class AuthorizedHeadersBuilder {
  private readonly token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error("Missing authentication token");
    }
    this.token = token;
  }

  public build(additionalHeaders: HttpHeaders = {}): HttpHeaders {
    return {
      Authorization: `Bearer ${this.token}`,
      ...additionalHeaders,
    };
  }
}


