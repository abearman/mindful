// amplify/backend/function/loadBookmarks/src/handler.ts
import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createDecipheriv } from "crypto";

import {
  ok, resp, getUserIdFromEvent, CorsPack, PayloadV1, PayloadV2
} from "../_shared/http";
import { withCorsAndErrors } from "../_shared/safe";
import {
  unauthorized,
  badRequest,
  unsupported,
  unprocessable,
  serverError,
} from "../_shared/errors";

const kmsClient = new KMSClient({});
const s3Client  = new S3Client({});

// --- helpers ---
const b64 = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// ------------------------------
// CORE LOGIC
// ------------------------------
const loadBookmarksCore = async (
  event: APIGatewayProxyEvent,
  cors: CorsPack
): Promise<APIGatewayProxyResult> => {
  const userId = getUserIdFromEvent(event);
  if (!userId) throw unauthorized("Unauthorized: Missing authentication details");

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw serverError("Server misconfiguration: missing S3_BUCKET_NAME");

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
      // corrupted/legacy plaintext → treat as empty
      return ok(cors, []);
    }

    if (payload.algo !== "AES-256-GCM" || typeof payload.version !== "number") {
      throw unsupported("UnsupportedCipher");
    }

    // --- 2) Obtain the correct plaintext data key ---
    let keyBuf: Buffer;

    if ("encKey" in payload && payload.encKey) {
      // V2: wrapped key embedded in same payload
      const { Plaintext } = await kmsClient.send(
        new DecryptCommand({
          CiphertextBlob: b64(payload.encKey),
          EncryptionContext: { userId }, // must match writer
        })
      );
      if (!Plaintext) throw serverError("Could not decrypt data key");
      keyBuf = Buffer.from(Plaintext as Uint8Array);
    } else {
      // V1: separate KEY_FILE_NAME object
      const keyObj = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: `private/${userId}/${process.env.KEY_FILE_NAME}`,
        })
      );
      if (!keyObj.Body) return ok(cors, []); // new account → nothing yet

      const wrappedKeyBytes = await keyObj.Body.transformToByteArray();
      const { Plaintext } = await kmsClient.send(
        new DecryptCommand({
          CiphertextBlob: wrappedKeyBytes,
          EncryptionContext: { userId },
        })
      );
      if (!Plaintext) throw serverError("Could not decrypt data key");
      keyBuf = Buffer.from(Plaintext as Uint8Array);
    }

    // --- 3) Normalize & validate envelope fields ---
    const iv  = b64(payload.iv);
    const tag = b64(payload.tag);
    const ct  = b64(payload.data);

    if (keyBuf.length !== 32) throw serverError("BadKeyLength", { code: "BadKeyLength" });
    if (iv.length !== 12)     throw badRequest("BadIvLength",   { code: "BadIvLength" });
    if (tag.length !== 16)    throw badRequest("BadTagLength",  { code: "BadTagLength" });

    // --- 4) Decrypt (with optional AAD) ---
    try {
      const decipher = createDecipheriv("aes-256-gcm", keyBuf, iv);
      if (payload.aad) decipher.setAAD(b64(payload.aad));
      decipher.setAuthTag(tag);
      const pt = Buffer.concat([decipher.update(ct), decipher.final()]);

      let bookmarks: unknown;
      try {
        bookmarks = JSON.parse(pt.toString("utf8"));
      } catch {
        // Plaintext not valid JSON → treat as empty
        return ok(cors, []);
      }

      return ok(cors, bookmarks ?? []);
    } catch (e: any) {
      if (typeof e?.message === "string" && /authenticate data/i.test(e.message)) {
        // Tag mismatch → tell client to keep last-known-good cache
        throw unprocessable("Decryption failed", { code: "AuthTagMismatch" });
      }
      // bubble to outer catch to keep uniform response via wrapper
      throw e;
    }
  } catch (error: any) {
    // Known S3 "not found" → empty array (first-time users, etc.)
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      return ok(cors, []);
    }
    // Any other error will be handled by withCorsAndErrors; rethrow to standardize
    throw error;
  }
};

// Exported handler uses the wrapper so *all* paths are structured
export const handler = withCorsAndErrors(loadBookmarksCore);
