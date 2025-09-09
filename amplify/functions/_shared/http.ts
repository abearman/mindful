import { ensureSecretsPresent, evalCors, preflightIfNeeded, assertCorsOr403 } from "../_shared/cors";
import { APIGatewayProxyResult } from "aws-lambda";


/* Types ---------------------------------------- */
export type CorsPack = ReturnType<typeof evalCors>;

// Works for REST (v1) and HTTP (v2)
export const getUserIdFromEvent = (event: any): string | undefined => {
  const restSub = event?.requestContext?.authorizer?.claims?.sub;
  const httpSub = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  return restSub ?? httpSub;
};

export type PayloadV1 = {
  version: number;
  algo: "AES-256-GCM";
  iv: string;    // b64
  tag: string;   // b64
  data: string;  // b64
  aad?: string;  // b64 optional
  // no encKey here → requires separate KEY_FILE_NAME
};

export type PayloadV2 = PayloadV1 & {
  encKey: string; // b64 KMS CiphertextBlob used for THIS ciphertext
};
/* ---------------------------------------- */

export const ok  = (cors: CorsPack, data: unknown): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: { ...cors.headers, "Content-Type": "application/json" },
  body: JSON.stringify(data ?? []),
});

export const resp = (cors: CorsPack, code: number, data: unknown): APIGatewayProxyResult => ({
  statusCode: code,
  headers: { ...cors.headers, "Content-Type": "application/json" },
  body: JSON.stringify(data ?? {}),
});