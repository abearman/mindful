import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createDecipheriv } from "crypto";
import { env } from '$amplify/env/saveBookmarksFunc';
import { ensureSecretsPresent, evalCors, preflightIfNeeded, assertCorsOr403 } from "../_shared/cors";

const kmsClient = new KMSClient({});
const s3Client = new S3Client({});

// Works for REST API (v1) and HTTP API (v2)
const getUserIdFromEvent = (event: any): string | undefined => {
  const restSub = event?.requestContext?.authorizer?.claims?.sub;          // REST
  const httpSub = event?.requestContext?.authorizer?.jwt?.claims?.sub;     // HTTP
  return restSub ?? httpSub;
};

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
  
  const userId = getUserIdFromEvent(event);
  if (!userId) {
    return { statusCode: 401, headers: cors.headers, body: JSON.stringify({ message: "Unauthorized: Missing authentication details" }) };
  }

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    return { statusCode: 500, headers: cors.headers, body: JSON.stringify({ message: "Server misconfiguration: missing S3_BUCKET_NAME" }) };
  }

  try {
    // 1) Read the wrapped data key
    const keyObj = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: `private/${userId}/${process.env.KEY_FILE_NAME}`,
    }));
    if (!keyObj.Body) {
      // No key yet → treat as no data
      return { statusCode: 200, headers: cors.headers, body: JSON.stringify([]) };
    }
    const wrappedKeyBytes = await keyObj.Body.transformToByteArray();

    // 2) Read the ciphertext package (JSON: {version, algo, iv, tag, data})
    const dataKey = `private/${userId}/${process.env.BOOKMARKS_FILE_NAME}`;
    const dataObj = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: dataKey,
    }));
    if (!dataObj.Body) {
      return { statusCode: 200, headers: cors.headers, body: JSON.stringify([]) };
    }
    const payloadText = await dataObj.Body.transformToString("utf-8");

    // If object exists but empty/malformed, be defensive
    if (!payloadText || !payloadText.trim()) {
      return { statusCode: 200, headers: cors.headers, body: JSON.stringify([]) };
    }

    let payload: {
      version: number;
      algo: string;
      iv: string;   // base64
      tag: string;  // base64
      data: string; // base64
    };
    try {
      payload = JSON.parse(payloadText);
    } catch {
      // If old format or corrupted, surface as empty for now
      return { statusCode: 200, headers: cors.headers, body: JSON.stringify([]) };
    }

    // 3) KMS Decrypt the wrapped key (must use same EncryptionContext)
    const { Plaintext } = await kmsClient.send(new DecryptCommand({
      CiphertextBlob: wrappedKeyBytes,
      EncryptionContext: { userId },
    }));
    if (!Plaintext) {
      return { statusCode: 500, headers: cors.headers, body: JSON.stringify({ message: "Could not decrypt data key" }) };
    }
    const key = Buffer.from(Plaintext as Uint8Array); // 32 bytes

    // 4) Decrypt with AES-256-GCM
    if (payload.algo !== "AES-256-GCM") {
      // If you ever need to support legacy formats, branch here.
      return { statusCode: 500, headers: cors.headers, body: JSON.stringify({ message: `Unsupported cipher: ${payload.algo}` }) };
    }

    const iv = Buffer.from(payload.iv, "base64");   // 12 bytes
    const tag = Buffer.from(payload.tag, "base64"); // 16 bytes
    const data = Buffer.from(payload.data, "base64");

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    const text = decrypted.toString("utf8");

    // 5) Parse bookmarks JSON (expect array/object)
    let bookmarks: unknown;
    try {
      bookmarks = JSON.parse(text);
    } catch {
      // Corrupt plaintext; treat as empty
      return { statusCode: 200, headers: cors.headers, body: JSON.stringify([]) };
    }

    return { statusCode: 200, headers: cors.headers, body: JSON.stringify(bookmarks ?? []) };
  } catch (error) {
    // If object not found, return empty list (fresh account)
    if (typeof error === "object" && error && "name" in error && (error as any).name === "NoSuchKey") {
      return { statusCode: 200, headers: cors.headers, body: JSON.stringify([]) };
    }
    console.error("Error loading bookmarks:", error);
    return { statusCode: 500, headers: cors.headers, body: JSON.stringify({ message: "Internal Server Error" }) };
  }
};
