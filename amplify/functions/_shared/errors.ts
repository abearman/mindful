export class HttpError extends Error {
  statusCode: number;
  details?: unknown;
  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Convenience factories
export const badRequest   = (m = "Bad Request", d?: unknown)        => new HttpError(400, m, d);
export const unauthorized = (m = "Unauthorized", d?: unknown)       => new HttpError(401, m, d);
export const forbidden    = (m = "Forbidden", d?: unknown)          => new HttpError(403, m, d);
export const notFound     = (m = "Not Found", d?: unknown)          => new HttpError(404, m, d);
export const conflict     = (m = "Conflict", d?: unknown)           => new HttpError(409, m, d);
export const unsupported  = (m = "Unsupported Media Type", d?: any) => new HttpError(415, m, d);
export const unprocessable= (m = "Unprocessable Entity", d?: any)   => new HttpError(422, m, d);
export const tooMany      = (m = "Too Many Requests", d?: any)      => new HttpError(429, m, d);
export const serverError  = (m = "Internal Server Error", d?: any)  => new HttpError(500, m, d);
