import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { env } from '$amplify/env/saveBookmarksFunc';
import { ensureSecretsPresent, evalCors, preflightIfNeeded, assertCorsOr403 } from "../_shared/cors";

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
    return {
      statusCode: 401,
      headers: cors.headers,
      body: JSON.stringify({ message: "Unauthorized: Missing authentication details" }),
    };
  }

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    return {
      statusCode: 500,
      headers: cors.headers,
      body: JSON.stringify({ message: "Server misconfiguration: missing S3_BUCKET_NAME" }),
    };
  }

  const bookmarkPath = `private/${userId}/${process.env.BOOKMARKS_FILE_NAME}`;
  const keyPath = `private/${userId}/${process.env.KEY_FILE_NAME}`;

  try {
    // Delete both objects; treat "not found" as success (idempotent delete)
    await Promise.all([
      s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: bookmarkPath })),
      s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: keyPath })),
    ]);

    return {
      statusCode: 204, // No Content
      headers: cors.headers,
      body: "",
    };
  } catch (error) {
    // If either key doesn't exist, S3 may still succeed; but just in case:
    const name = (error as any)?.name;
    if (name === "NoSuchKey" || name === "NotFound") {
      return { statusCode: 204, headers: cors.headers, body: "" };
    }

    console.error("Error deleting bookmarks:", error);
    return {
      statusCode: 500,
      headers: cors.headers,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
