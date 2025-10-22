// test/handlers.integration.test.ts
import { randomBytes, createCipheriv } from 'crypto';
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from "@aws-sdk/client-kms";
import * as stream from "node:stream";
import { handler as save } from "../../../../amplify/functions/saveBookmarks/handler";  
import { handler as load } from "../../../../amplify/functions/loadBookmarks/handler";
import { handler as del }  from "../../../../amplify/functions/deleteBookmarks/handler";

const s3Mock = mockClient(S3Client);
const kmsMock = mockClient(KMSClient);

// Helper to fake S3 GetObject Body
const bodyFromString = (s: string) => ({
  transformToString: async () => s,
  transformToByteArray: async () => new TextEncoder().encode(s),
});
const bodyFromBytes = (b: Uint8Array) => ({
  transformToString: async () => Buffer.from(b).toString("utf8"),
  transformToByteArray: async () => b,
});

const authEvent = (method: "GET"|"POST"|"DELETE", body?: any) => ({
  httpMethod: method,
  body: body ? JSON.stringify(body) : null,
  headers: { origin: "http://localhost:5173" },
  requestContext: { authorizer: { jwt: { claims: { sub: "user-123" } } } },
} as any);

describe("Bookmarks handlers", () => {
  beforeEach(() => {
    s3Mock.reset();
    kmsMock.reset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  test("saveBookmarks writes V2 payload with encKey + legacy key", async () => {
    // Arrange: mock KMS + let S3 PutObject succeed
    const dataKey = randomBytes(32);
    const wrapped = randomBytes(96); // mock KMS CiphertextBlob bytes
  
    kmsMock.on(GenerateDataKeyCommand).resolves({
      Plaintext: dataKey,
      CiphertextBlob: wrapped,
    });
  
    // Let all PutObject calls resolve; we'll inspect them afterward
    s3Mock.on(PutObjectCommand).resolves({ $metadata: {} as any });
  
    // Act
    const res = await save(authEvent("POST", [{ id: 1, name: "Foo" }]));
  
    // Assert status
    expect(res.statusCode).toBe(200);
  
    // Inspect what was written to S3
    const puts = s3Mock.commandCalls(PutObjectCommand);
  
    // Build a quick lookup: key -> body
    const byKey: Record<string, any> = Object.fromEntries(
      puts.map(call => {
        const input = call.args[0].input;
        return [String(input.Key), input.Body as any];
      })
    );
  
    // 1) V2 payload written to BOOKMARKS_FILE_NAME
    const payloadKey = `private/user-123/${process.env.BOOKMARKS_FILE_NAME}`;
    expect(byKey[payloadKey]).toBeDefined();
  
    const payloadStr = String(byKey[payloadKey]);
    const payload = JSON.parse(payloadStr);
  
    expect(payload.version).toBe(2);
    expect(payload.algo).toBe("AES-256-GCM");
    expect(typeof payload.iv).toBe("string");
    expect(typeof payload.tag).toBe("string");
    expect(typeof payload.data).toBe("string");
    expect(typeof payload.encKey).toBe("string"); // embedded wrapped key present
    // aad is optional; if you're saving it, you can assert it's present:
    // expect(typeof payload.aad).toBe("string");
  
    // 2) Legacy key file also written (for backward compatibility)
    const legacyKey = `private/user-123/${process.env.KEY_FILE_NAME}`;
    expect(byKey[legacyKey]).toBeDefined();
    expect(Buffer.isBuffer(byKey[legacyKey])).toBe(true);
  });
  
  test("loadBookmarks decrypts V2 and returns bookmarks", async () => {
    // Prepare a real V2 payload using the same flow as save
    const dataKey = randomBytes(32);
    const wrapped = randomBytes(96);
    kmsMock.on(DecryptCommand).resolves({ Plaintext: dataKey });

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
    const aad = Buffer.from("user-123","utf8");
    cipher.setAAD(aad);
    const pt = Buffer.from(JSON.stringify([{ id: 1, name: "Foo" }]), "utf8");
    const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
    const tag = cipher.getAuthTag();

    const payloadV2 = JSON.stringify({
      version: 2,
      algo: "AES-256-GCM",
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      data: ct.toString("base64"),
      encKey: Buffer.from(wrapped).toString("base64"),
      aad: aad.toString("base64"),
    });

    s3Mock.on(GetObjectCommand).resolves({ Body: bodyFromString(payloadV2) });

    const r = await load(authEvent("GET"));
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].name).toBe("Foo");
  });

  test("loadBookmarks returns 422 on tag mismatch (client should keep cache)", async () => {
    // Wrong tag on purpose
    kmsMock.on(DecryptCommand).resolves({ Plaintext: randomBytes(32) });
    const badPayload = JSON.stringify({
      version: 2, algo: "AES-256-GCM",
      iv: randomBytes(12).toString("base64"),
      tag: randomBytes(16).toString("base64"),
      data: randomBytes(32).toString("base64"),
      encKey: randomBytes(64).toString("base64"),
    });
    s3Mock.on(GetObjectCommand).resolves({ Body: bodyFromString(badPayload) });

    const r = await load(authEvent("GET"));
    expect(r.statusCode).toBe(422);
    expect(JSON.parse(r.body).details.code).toBe("AuthTagMismatch");
  });

  test("deleteBookmarks returns 204 and issues S3 deletes", async () => {
    // Arrange: allow S3 deletes to succeed
    s3Mock.reset();
    s3Mock.on(DeleteObjectCommand).resolves({ $metadata: {} as any });

    // Act
    const res = await del(authEvent("DELETE"));

    // Assert: status (your handler currently returns 204; allow 200 if you later switch to JSON)
    expect([204, 200]).toContain(res.statusCode);

    // Inspect what was deleted
    const calls = s3Mock.commandCalls(DeleteObjectCommand);
    const deletedKeys = calls.map((c) => String(c.args[0].input.Key));

    // Main payload must be deleted
    expect(deletedKeys).toContain(
      `private/user-123/${process.env.BOOKMARKS_FILE_NAME}`
    );

    // Legacy key file is optional (only if KEY_FILE_NAME is set)
    if (process.env.KEY_FILE_NAME) {
      expect(deletedKeys).toContain(
        `private/user-123/${process.env.KEY_FILE_NAME}`
      );
    }
  });
});
