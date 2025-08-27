import { KMSClient, GenerateDataKeyCommand } from "@aws-sdk/client-kms";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createCipheriv, randomBytes } from "crypto";

const kmsClient = new KMSClient({});
const s3Client = new S3Client({});

// Works for REST API (v1) and HTTP API (v2)
const getUserIdFromEvent = (event: any): string | undefined => {
  const restSub = event?.requestContext?.authorizer?.claims?.sub;          // REST
  const httpSub = event?.requestContext?.authorizer?.jwt?.claims?.sub;     // HTTP
  return restSub ?? httpSub;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };

  // Basic auth check
  const userId = getUserIdFromEvent(event);
  if (!userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ message: "Unauthorized: Missing authentication details" }) };
  }

  if (!event.body) {
    return { statusCode: 400, headers, body: JSON.stringify({ message: "Bad Request: Missing request body" }) };
  }

  let bookmarksToSave: unknown;
  try {
    bookmarksToSave = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ message: "Bad Request: Body must be valid JSON" }) };
  }

  if (!process.env.S3_BUCKET_NAME || !process.env.KMS_KEY_ID) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Server misconfiguration: missing S3_BUCKET_NAME or KMS_KEY_ID" }),
    };
  }

  try {
    // 1) KMS: generate a 32-byte data key for AES-256
    const { Plaintext, CiphertextBlob } = await kmsClient.send(
      new GenerateDataKeyCommand({
        KeyId: process.env.KMS_KEY_ID,
        KeySpec: "AES_256",
        EncryptionContext: { userId },
      })
    );
    if (!Plaintext || !CiphertextBlob) {
      return { statusCode: 500, headers, body: JSON.stringify({ message: "Failed to generate encryption key" }) };
    }

    // 2) Encrypt with AES-256-GCM
    const key = Buffer.from(Plaintext as Uint8Array); // 32 bytes
    const iv = randomBytes(12);                        // 12-byte nonce for GCM
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const plaintext = Buffer.from(JSON.stringify(bookmarksToSave), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    // 3) Write ciphertext package to S3 (JSON so it’s self-describing)
    const payload = {
      version: 1,
      algo: "AES-256-GCM",
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      data: ciphertext.toString("base64"),
    };

    const dataKey = `private/${userId}/${process.env.BOOKMARKS_FILE_NAME}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: dataKey,
        Body: JSON.stringify(payload),
        ContentType: "application/json",
      })
    );

    // 4) Store the KMS-wrapped key as raw bytes (you’ll Decrypt this in your loader)
    const wrappedKeyKey = `private/${userId}/${process.env.KEY_FILE_NAME}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: wrappedKeyKey,
        Body: Buffer.from(CiphertextBlob as Uint8Array),
        ContentType: "application/octet-stream",
      })
    );

    return { statusCode: 200, headers, body: JSON.stringify({ message: "Bookmarks saved successfully" }) };
  } catch (error) {
    console.error("Error saving bookmarks:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Internal Server Error", error: msg }) };
  }
};
