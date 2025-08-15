import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';


const s3Client = new S3Client({});

const BOOKMARKS_FILE_NAME = "bookmarks.json.encrypted";
const KEY_FILE_NAME = "bookmarks.key";


export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const allowedOrigin = process.env.allowedOrigin;

  if (!allowedOrigin) {
    console.error("CRITICAL: ALLOWED_ORIGIN environment variable is not set.");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Internal Server Error: Service misconfiguration." }),
    };
  }

  if (!event.requestContext.authorizer?.claims?.sub) {
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": allowedOrigin }, 
      body: JSON.stringify({ message: 'Unauthorized: Missing authentication details' }),
    };
  }

  // If the code reaches here, TypeScript knows the values are not null.
  const userId = event.requestContext.authorizer.claims.sub;

  const s3Bucket = process.env.S3_BUCKET_NAME;
  const bookmarkPath = `private/${userId}/${BOOKMARKS_FILE_NAME}`;
  const keyPath = `private/${userId}/${KEY_FILE_NAME}`;

  try {
    const deleteBookmarkFile = s3Client.send(new DeleteObjectCommand({
      Bucket: s3Bucket,
      Key: bookmarkPath
    }));
    const deleteKeyFile = s3Client.send(new DeleteObjectCommand({
      Bucket: s3Bucket,
      Key: keyPath
    }));
    await Promise.all([deleteBookmarkFile, deleteKeyFile]);
    
    return {
      statusCode: 204,
      headers: { "Access-Control-Allow-Origin": allowedOrigin },
      body: '',
    };

  } catch (error) {
    console.error("Error deleting bookmarks:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": allowedOrigin },
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};