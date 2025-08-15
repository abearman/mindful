import { KMSClient, GenerateDataKeyCommand } from "@aws-sdk/client-kms";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import CryptoJS from "crypto-js";

const kmsClient = new KMSClient({});
const s3Client = new S3Client({});

const BOOKMARKS_FILE_NAME = "bookmarks.json.encrypted";
const KEY_FILE_NAME = "bookmarks.key";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {  
  const allowedOrigin = process.env.ALLOWED_ORIGIN;

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
      body: JSON.stringify({ message: 'Unauthorized: Missing authentication details' }),
    };
  }

  // If the code reaches here, TypeScript knows the values are not null.
  const userId = event.requestContext.authorizer.claims.sub;  

  if (!event.body) {
    return {
      statusCode: 400, // Bad Request
      headers: { "Access-Control-Allow-Origin": allowedOrigin },
      body: JSON.stringify({ message: "Bad Request: Missing request body" }),
    };
  }
  
  // After the check, TypeScript knows event.body is a string.
  const bookmarksToSave = JSON.parse(event.body);
  
  if (!bookmarksToSave) {
    return { statusCode: 400, body: JSON.stringify({ message: "No data provided" }) };
  }
  
  try {
    const command = new GenerateDataKeyCommand({
      KeyId: process.env.KMS_KEY_ID,
      KeySpec: "AES_256",
      EncryptionContext: { userId: userId }
    });
    const { Plaintext, CiphertextBlob } = await kmsClient.send(command);

    if (!Plaintext || !CiphertextBlob) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": allowedOrigin },
        body: JSON.stringify({ message: "Internal Server Error: Failed to generate encryption key" }),
      };
    }

    // Convert the raw plaintext key into a format CryptoJS understands
    const keyHex = Buffer.from(Plaintext).toString('hex');
    const encryptionKey = CryptoJS.enc.Hex.parse(keyHex);

    // Use the correctly formatted key to encrypt the user's bookmarks
    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(bookmarksToSave), encryptionKey).toString();

    const s3Path = `private/${userId}/${BOOKMARKS_FILE_NAME}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Path,
      Body: encryptedData,
      ContentType: "text/plain"
    }));

    const keyPath = `private/${userId}/${KEY_FILE_NAME}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: keyPath,
      Body: CiphertextBlob
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": allowedOrigin },
      body: JSON.stringify({ message: "Bookmarks saved successfully" }),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error saving bookmarks:", error);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": allowedOrigin },
        body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
      };
    } else {
      // Handle cases where a non-Error was thrown (e.g., throw "some string")
      console.error("An unexpected non-Error value was thrown:", error);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": allowedOrigin },
        body: JSON.stringify({ message: "An unknown internal server error occurred" }),
      };
    }
  }
};