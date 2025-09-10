import { evalCors, preflightIfNeeded, assertCorsOr403 } from "./cors";
import { HttpError } from "./errors";

// Wrapper that injects CORS + handles all errors uniformly.
export const withCorsAndErrors = (
  inner: (event: any, cors: ReturnType<typeof evalCors>) => Promise<any>
) => {
  return async (event: any) => {
    try {
      const cors = evalCors(event);
      const pre = preflightIfNeeded(cors);   if (pre)  return pre;
      const ban = assertCorsOr403(cors);     if (ban)  return ban;

      const out = await inner(event, cors);
      // pass-through full responses; otherwise wrap as 200 in your inner
      return out;
    } catch (err: any) {
      // We may not have cors if evalCors itself failed; use best-effort headers
      const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
        "Access-Control-Allow-Credentials": "true",
      };

      if (err instanceof HttpError) {
        console.error("[HttpError]", { statusCode: err.statusCode, message: err.message, details: err.details });
        return {
          statusCode: err.statusCode,
          headers,
          body: JSON.stringify({ message: err.message, ...(err.details ? { details: err.details } : {}) }),
        };
      }

      console.error("[UnhandledError]", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: "Internal Server Error" }),
      };
    }
  };
};
