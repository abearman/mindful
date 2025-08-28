// functions/_shared/cors.ts

export interface CorsConfig {
  idsCsv?: string;            // e.g. "abcd123, wxyz789"
  legacyOrigin?: string;      // e.g. "chrome-extension://abcd123"
  nodeEnv?: string;           // defaults to process.env.NODE_ENV
  allowCredentials?: boolean; // set true if you use cookies/auth headers that require it
}

export interface CorsOutcome {
  headers: Record<string, string>;
  isAllowed: boolean;
  origin: string;
  method: string;
}

/** Normalize method across REST (v1) and HTTP (v2) APIs */
export const getMethod = (event: any): string =>
  event?.requestContext?.http?.method || event?.httpMethod || "";

/** Normalize Origin header */
export const getOrigin = (event: any): string =>
  event?.headers?.origin || event?.headers?.Origin || "";

/** Build allow-list from a CSV of extension IDs + an optional legacy full origin */
export const computeAllowedOrigins = (idsCsv?: string, legacyOrigin?: string): Set<string> => {
  const allow = new Set<string>();
  if (idsCsv) {
    idsCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((id) => {
        allow.add(id.startsWith("chrome-extension://") ? id : `chrome-extension://${id}`);
      });
  }
  if (legacyOrigin) allow.add(legacyOrigin);
  return allow;
};

/** Throw early in prod if no CORS config present */
export const ensureSecretsPresent = (idsCsv?: string, legacyOrigin?: string) => {
  if (!idsCsv && !legacyOrigin && process.env.NODE_ENV === "production") {
    throw new Error("Missing ALLOWED_EXTENSION_IDS/ALLOWED_ORIGIN secret(s) in production");
  }
};

/** Evaluate CORS for this request and produce headers you can reuse in all responses */
export const evalCors = (event: any, cfg: CorsConfig = {}): CorsOutcome => {
  const nodeEnv = cfg.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const origin = getOrigin(event);
  const method = getMethod(event);

  const allowSet = computeAllowedOrigins(cfg.idsCsv, cfg.legacyOrigin);
  const devFallback = nodeEnv !== "production" && allowSet.size === 0;
  const isAllowed = allowSet.size ? allowSet.has(origin) : devFallback;

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
  if (cfg.allowCredentials) headers["Access-Control-Allow-Credentials"] = "true";

  return { headers, isAllowed, origin, method };
};

/** Return a 204 preflight response if this is OPTIONS; otherwise null */
export const preflightIfNeeded = (outcome: CorsOutcome) => {
  if (outcome.method === "OPTIONS") {
    return { statusCode: 204, headers: outcome.headers, body: "" };
  }
  return null;
};

/** Return a 403 if origin is not allowed in production; otherwise null */
export const assertCorsOr403 = (outcome: CorsOutcome) => {
  if (process.env.NODE_ENV === "production" && !outcome.isAllowed) {
    return {
      statusCode: 403,
      headers: outcome.headers,
      body: JSON.stringify({ message: "Origin not allowed" }),
    };
  }
  return null;
};
