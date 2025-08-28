import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { env } from '$amplify/env/saveBookmarksFunc';

const s3Client = new S3Client({});

// Works for REST API (v1) and HTTP API (v2)
const getUserIdFromEvent = (event: any): string | undefined => {
  const restSub = event?.requestContext?.authorizer?.claims?.sub;          // REST
  const httpSub = event?.requestContext?.authorizer?.jwt?.claims?.sub;     // HTTP
  return restSub ?? httpSub;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!env.ALLOWED_ORIGIN && process.env.NODE_ENV === 'production') {
    throw new Error("Missing ALLOWED_ORIGIN secret in production");
  }

  const allowedOrigin = env.ALLOWED_ORIGIN ?? "*"; // resolved securely at runtime
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };

  const userId = getUserIdFromEvent(event);
  if (!userId) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: "Unauthorized: Missing authentication details" }),
    };
  }

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    return {
      statusCode: 500,
      headers,
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
      headers,
      body: "",
    };
  } catch (error) {
    // If either key doesn't exist, S3 may still succeed; but just in case:
    const name = (error as any)?.name;
    if (name === "NoSuchKey" || name === "NotFound") {
      return { statusCode: 204, headers, body: "" };
    }

    console.error("Error deleting bookmarks:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
