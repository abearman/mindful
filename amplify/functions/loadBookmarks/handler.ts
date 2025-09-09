import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createDecipheriv } from "crypto";
import { env } from '$amplify/env/saveBookmarksFunc';
import { ensureSecretsPresent, evalCors, preflightIfNeeded, assertCorsOr403 } from "../_shared/cors";

const kmsClient = new KMSClient({});
const s3Client  = new S3Client({});

// --- helpers ---
const b64 = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const ok  = (cors: any, data: unknown): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: { ...cors.headers, "Content-Type": "application/json" },
  body: JSON.stringify(data ?? []),
});
const resp = (cors: any, code: number, data: unknown): APIGatewayProxyResult => ({
  statusCode: code,
  headers: { ...cors.headers, "Content-Type": "application/json" },
  body: JSON.stringify(data ?? {}),
});

// Works for REST (v1) and HTTP (v2)
const getUserIdFromEvent = (event: any): string | undefined => {
  const restSub = event?.requestContext?.authorizer?.claims?.sub;
  const httpSub = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  return restSub ?? httpSub;
};

type PayloadV1 = {
  version: number;
  algo: "AES-256-GCM";
  iv: string;    // b64
  tag: string;   // b64
  data: string;  // b64
  aad?: string;  // b64 optional
  // no encKey here → requires separate KEY_FILE_NAME
};

type PayloadV2 = PayloadV1 & {
  encKey: string; // b64 KMS CiphertextBlob used for THIS ciphertext
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // CORS boilerplate (unchanged)
  ensureSecretsPresent(env.ALLOWED_EXTENSION_IDS, env.ALLOWED_ORIGIN);
  const cors = evalCors(event, { idsCsv: env.ALLOWED_EXTENSION_IDS, legacyOrigin: env.ALLOWED_ORIGIN });
  const maybePreflight = preflightIfNeeded(cors); if (maybePreflight) return maybePreflight;
  const maybe403 = assertCorsOr403(cors); if (maybe403) return maybe403;

  const userId = getUserIdFromEvent(event);
  if (!userId) return resp(cors, 401, { message: "Unauthorized: Missing authentication details" });

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) return resp(cors, 500, { message: "Server misconfiguration: missing S3_BUCKET_NAME" });

  try {
    // --- 1) Load the ciphertext envelope (single object) ---
    const dataKey = `private/${userId}/${process.env.BOOKMARKS_FILE_NAME}`;
    const dataObj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: dataKey }));
    if (!dataObj.Body) return ok(cors, []);

    const payloadText = await dataObj.Body.transformToString("utf-8");
    if (!payloadText?.trim()) return ok(cors, []);

    let payload: PayloadV1 | PayloadV2;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      return ok(cors, []); // corrupted/legacy plaintext → treat as empty
    }

    if (payload.algo !== "AES-256-GCM" || typeof payload.version !== "number") {
      return resp(cors, 415, { code: "UnsupportedCipher" });
    }

    // --- 2) Obtain the correct plaintext data key ---
    let keyBuf: Buffer;

    if ("encKey" in payload && payload.encKey) {
      // V2 path: use the wrapped key embedded in the same payload (NO extra S3 read)
      const { Plaintext } = await kmsClient.send(new DecryptCommand({
        CiphertextBlob: b64(payload.encKey),
        EncryptionContext: { userId }, // must match writer
      }));
      if (!Plaintext) return resp(cors, 500, { message: "Could not decrypt data key" });
      keyBuf = Buffer.from(Plaintext as Uint8Array);
    } else {
      // V1 fallback: fetch KEY_FILE_NAME (legacy two-object flow)
      const keyObj = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: `private/${userId}/${process.env.KEY_FILE_NAME}`,
      }));
      if (!keyObj.Body) return ok(cors, []); // new account
      const wrappedKeyBytes = await keyObj.Body.transformToByteArray();

      const { Plaintext } = await kmsClient.send(new DecryptCommand({
        CiphertextBlob: wrappedKeyBytes,
        EncryptionContext: { userId },
      }));
      if (!Plaintext) return resp(cors, 500, { message: "Could not decrypt data key" });
      keyBuf = Buffer.from(Plaintext as Uint8Array);
    }

    // --- 3) Normalize & validate envelope fields ---
    const iv  = b64(payload.iv);
    const tag = b64(payload.tag);
    const ct  = b64(payload.data);
    if (keyBuf.length !== 32) return resp(cors, 500, { code: "BadKeyLength" });
    if (iv.length !== 12)     return resp(cors, 400, { code: "BadIvLength" });
    if (tag.length !== 16)    return resp(cors, 400, { code: "BadTagLength" });

    // --- 4) Decrypt (with optional AAD) ---
    try {
      const decipher = createDecipheriv("aes-256-gcm", keyBuf, iv);
      if (payload.aad) decipher.setAAD(b64(payload.aad));
      decipher.setAuthTag(tag);
      const pt = Buffer.concat([decipher.update(ct), decipher.final()]);

      let bookmarks: unknown;
      try { bookmarks = JSON.parse(pt.toString("utf8")); }
      catch { return ok(cors, []); }

      return ok(cors, bookmarks ?? []);
    } catch (e: any) {
      if (typeof e?.message === "string" && /authenticate data/i.test(e.message)) {
        // Tag mismatch → tell client to keep last-known-good cache
        return resp(cors, 422, { code: "AuthTagMismatch", message: "Decryption failed" });
      }
      throw e;
    }
  } catch (error: any) {
    if (error?.name === "NoSuchKey") return ok(cors, []);
    console.error("Error loading bookmarks:", error);
    return resp(cors, 500, { message: "Internal Server Error" });
  }
};
