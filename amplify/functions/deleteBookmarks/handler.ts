// amplify/backend/function/deleteBookmarks/src/handler.ts
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// NEW: keep-alive for AWS SDK v3
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent as HttpsAgent } from "https";

import { withCorsAndErrors } from "../_shared/safe";
import { evalCors } from "../_shared/cors"; // for CorsPack type
import { unauthorized, serverError } from "../_shared/errors";

// --- Keep-alive setup (module scope; reused across warm invokes) ---
const httpsAgent = new HttpsAgent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 30_000,
});
const requestHandler = new NodeHttpHandler({ httpsAgent });

// Reuse S3 client across invocations with keep-alive enabled
const s3Client = new S3Client({ requestHandler });

type CorsPack = ReturnType<typeof evalCors>;

// Works for REST API (v1) and HTTP API (v2)
const getUserIdFromEvent = (event: any): string | undefined => {
  const restSub = event?.requestContext?.authorizer?.claims?.sub;      // REST (v1)
  const httpSub = event?.requestContext?.authorizer?.jwt?.claims?.sub; // HTTP (v2)
  return restSub ?? httpSub;
};

const deleteBookmarksCore = async (
  event: APIGatewayProxyEvent,
  cors: CorsPack
): Promise<APIGatewayProxyResult> => {
  const userId = getUserIdFromEvent(event);
  if (!userId) throw unauthorized("Unauthorized: Missing authentication details");

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw serverError("Server misconfiguration: missing S3_BUCKET_NAME");

  const bookmarksKey = `private/${userId}/${process.env.BOOKMARKS_FILE_NAME}`;
  const legacyKeyName = process.env.KEY_FILE_NAME; // optional (legacy V1)

  // Build deletions (idempotent)
  const deletions: Promise<any>[] = [
    s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: bookmarksKey })),
  ];
  if (legacyKeyName) {
    const legacyKeyPath = `private/${userId}/${legacyKeyName}`;
    deletions.push(
      s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: legacyKeyPath }))
    );
  }

  // Treat not-found as success
  await Promise.allSettled(deletions);

  // 204 No Content (keep CORS headers)
  return {
    statusCode: 204,
    headers: { ...cors.headers },
    body: "",
  };

  // If you prefer JSON responses everywhere, switch to:
  // return { statusCode: 200, headers: { ...cors.headers, "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};

// Exported entrypoint — wrapper handles CORS, OPTIONS, and error shaping (HttpError or generic)
export const handler = withCorsAndErrors(deleteBookmarksCore);
