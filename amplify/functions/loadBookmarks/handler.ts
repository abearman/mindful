import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Buffer } from 'buffer'; 
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

  const s3Bucket = process.env.S3_BUCKET_NAME;

  try {
    const keyObject = await s3Client.send(new GetObjectCommand({
        Bucket: s3Bucket,
        Key: `private/${userId}/${KEY_FILE_NAME}`
    }));

    const dekKey = `private/${userId}/${BOOKMARKS_FILE_NAME}`;
    if (!keyObject.Body) {
      // If the body is missing, we can't continue.
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": allowedOrigin },
        body: JSON.stringify({ message: "Internal Server Error: Missing key data" }),
      };
    }

    // If the code reaches this point, TypeScript knows keyObject.Body is defined.
    const encryptedDek = await keyObject.Body.transformToByteArray();

    const dataObject = await s3Client.send(
      new GetObjectCommand({ Bucket: s3Bucket, Key: dekKey }
    ));

    if (!dataObject.Body) {
      // If the body is missing, the function can't continue.
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": allowedOrigin },
        body: JSON.stringify({ message: "Internal Server Error: Missing data" }),
      };
    }

    // After this check, TypeScript knows dataObject.Body is a valid stream.
    const encryptedData = await dataObject.Body.transformToString("utf-8"); 
    
    const decryptCommand = new DecryptCommand({
      CiphertextBlob: encryptedDek,
      EncryptionContext: { userId: userId }
    });
    const { Plaintext } = await kmsClient.send(decryptCommand);

    if (!Plaintext) {
      // If the decryption key is missing, we cannot continue.
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": allowedOrigin },
        body: JSON.stringify({ message: "Internal Server Error: Could not process key" }),
      };
    }

    // Convert the raw key into a format CryptoJS understands
    const keyHex = Buffer.from(Plaintext).toString('hex');
    const decryptionKey = CryptoJS.enc.Hex.parse(keyHex);

    // Use the correctly formatted key to decrypt the data
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, decryptionKey);
    const decryptedJson = decryptedBytes.toString(CryptoJS.enc.Utf8);
    const bookmarks = JSON.parse(decryptedJson);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": allowedOrigin },
      body: JSON.stringify(bookmarks),
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NoSuchKey') {
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": allowedOrigin },
            body: JSON.stringify([]),
        };
      }
      // This return handles any other type of Error
      console.error("Error loading bookmarks:", error);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": allowedOrigin },
        body: JSON.stringify({ message: "Internal Server Error" }),
      };
    } else {
      // This 'else' block handles anything thrown that ISN'T an Error object
      console.error("An unexpected non-Error value was thrown:", error);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": allowedOrigin },
        body: JSON.stringify({ message: "An unknown error occurred" }),
      };
    }
  }
};