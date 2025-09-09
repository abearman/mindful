// amplify/backend/function/saveBookmarks/src/handler.ts
import { KMSClient, GenerateDataKeyCommand } from "@aws-sdk/client-kms";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createCipheriv, randomBytes } from "crypto";
import { env } from '$amplify/env/saveBookmarksFunc';
import {
  ensureSecretsPresent,
  evalCors,
  preflightIfNeeded,
  assertCorsOr403,
} from "../_shared/cors";

// Reuse clients
const kmsClient = new KMSClient({});
const s3Client  = new S3Client({});

// Works for REST API (v1) and HTTP API (v2)
const getUserIdFromEvent = (event: any): string | undefined => {
  const restSub = event?.requestContext?.authorizer?.claims?.sub;          // REST
  const httpSub = event?.requestContext?.authorizer?.jwt?.claims?.sub;     // HTTP
  return restSub ?? httpSub;
};

const jsonResp = (cors: any, statusCode: number, data: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { ...cors.headers, "Content-Type": "application/json" },
  body: JSON.stringify(data ?? {}),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Ensure CORS secrets exist in prod (ALLOWED_EXTENSION_IDS CSV and/or ALLOWED_ORIGIN)
  ensureSecretsPresent(env.ALLOWED_EXTENSION_IDS, env.ALLOWED_ORIGIN);

  // Build CORS headers once; reuse for all responses
  const cors = evalCors(event, {
    idsCsv: env.ALLOWED_EXTENSION_IDS,
    legacyOrigin: env.ALLOWED_ORIGIN,
  });

  // Handle preflight early
  const maybePreflight = preflightIfNeeded(cors);
  if (maybePreflight) return maybePreflight;

  // Block disallowed origins in production
  const maybe403 = assertCorsOr403(cors);
  if (maybe403) return maybe403;

  // Basic auth check
  const userId = getUserIdFromEvent(event);
  if (!userId) {
    return jsonResp(cors, 401, { message: "Unauthorized: Missing authentication details" });
  }

  if (!event.body) {
    return jsonResp(cors, 400, { message: "Bad Request: Missing request body" });
  }

  let bookmarksToSave: unknown;
  try {
    bookmarksToSave = JSON.parse(event.body);
  } catch {
    return jsonResp(cors, 400, { message: "Bad Request: Body must be valid JSON" });
  }

  const bucket = process.env.S3_BUCKET_NAME;
  const kmsKeyId = process.env.KMS_KEY_ID;
  if (!bucket || !kmsKeyId) {
    return jsonResp(cors, 500, { message: "Server misconfiguration: missing S3_BUCKET_NAME or KMS_KEY_ID" });
  }

  try {
    // 1) KMS: generate a 32-byte data key for AES-256, bound to userId context
    const { Plaintext, CiphertextBlob } = await kmsClient.send(
      new GenerateDataKeyCommand({
        KeyId: kmsKeyId,
        KeySpec: "AES_256",
        EncryptionContext: { userId },
      })
    );
    if (!Plaintext || !CiphertextBlob) {
      return jsonResp(cors, 500, { message: "Failed to generate encryption key" });
    }

    // 2) Encrypt with AES-256-GCM
    const key = Buffer.from(Plaintext as Uint8Array); // 32 bytes
    const iv  = randomBytes(12);                      // 12-byte nonce for GCM
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    // Optional but recommended: bind ciphertext to this user via AAD
    const aad = Buffer.from(userId, "utf8");
    cipher.setAAD(aad);

    const plaintext = Buffer.from(JSON.stringify(bookmarksToSave), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    // 3) Single self-contained payload (V2) — includes the wrapped key used here
    const payloadV2 = {
      version: 2 as const,
      algo: "AES-256-GCM",
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      data: ciphertext.toString("base64"),
      encKey: Buffer.from(CiphertextBlob as Uint8Array).toString("base64"),
      aad: aad.toString("base64"), // loader will set AAD if present
    };

    const dataKey = `private/${userId}/${process.env.BOOKMARKS_FILE_NAME}`;

    // Write the *single* JSON envelope (atomic for readers)
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: dataKey,
        Body: JSON.stringify(payloadV2),
        ContentType: "application/json",
      })
    );

    // 4) Legacy dual-write (optional; safe to remove once all readers use V2)
    //    This keeps older loaders (if any) alive, but your updated loader will prefer encKey.
    if (process.env.KEY_FILE_NAME) {
      const legacyKeyPath = `private/${userId}/${process.env.KEY_FILE_NAME}`;
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: legacyKeyPath,
            Body: Buffer.from(CiphertextBlob as Uint8Array),
            ContentType: "application/octet-stream",
          })
        );
      } catch (e) {
        // Non-fatal; the V2 payload is authoritative
        console.warn("Legacy key write failed (non-fatal):", e);
      }
    }

    return jsonResp(cors, 200, { message: "Bookmarks saved successfully" });
  } catch (error) {
    console.error("Error saving bookmarks:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResp(cors, 500, { message: "Internal Server Error", error: msg });
  }
};
