import { describe, expect, it, vi } from "vitest";
import { useDecryption, useEncryption } from "./use-crypto";
// Mock import.meta.server
vi.stubGlobal("import", { meta: { server: false } });

describe("useCrypto", () => {
  describe("useEncryption", () => {
    it("should generate a valid JWK key string", async () => {
      const { generateKey } = useEncryption();
      const key = await generateKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
      // JWK 'k' for 128-bit key is typically 22 characters base64url encoded
      expect(key).toMatch(/^[\w-]+$/);
    });

    it("should encrypt data and return an ArrayBuffer", async () => {
      const { generateKey, encryptData } = useEncryption();
      const key = await generateKey();
      const testData = "Hello World";

      const encrypted = await encryptData(testData, key);

      expect(encrypted).toBeInstanceOf(ArrayBuffer);
      expect(encrypted.byteLength).toBeGreaterThan(0);
    });
  });

  describe("useDecryption", () => {
    it("should decrypt encrypted data back to original string", async () => {
      const { generateKey, encryptData } = useEncryption();
      const { decryptBlob } = useDecryption();

      const key = await generateKey();
      const testData = JSON.stringify({ message: "Secret message", id: 123 });

      const encryptedBuffer = await encryptData(testData, key);
      const encryptedBlob = new Blob([encryptedBuffer]);

      const decrypted = await decryptBlob(encryptedBlob, key);

      expect(decrypted).toBe(testData);
      expect(JSON.parse(decrypted)).toEqual({ message: "Secret message", id: 123 });
    });

    it("should throw error if decryption fails with wrong key", async () => {
      const { generateKey, encryptData } = useEncryption();
      const { decryptBlob } = useDecryption();

      const key1 = await generateKey();
      const key2 = await generateKey();
      const testData = "Secret";

      const encryptedBuffer = await encryptData(testData, key1);
      const encryptedBlob = new Blob([encryptedBuffer]);

      await expect(decryptBlob(encryptedBlob, key2)).rejects.toThrow();
    });
  });

  it("should end-to-end encrypt and decrypt properly", async () => {
    const { generateKey, encryptData } = useEncryption();
    const { decryptBlob } = useDecryption();

    const key = await generateKey();
    const originalObject = { foo: "bar", baz: [1, 2, 3] };
    const originalString = JSON.stringify(originalObject);

    const encrypted = await encryptData(originalString, key);
    const blob = new Blob([encrypted]);
    const decryptedString = await decryptBlob(blob, key);

    expect(decryptedString).toBe(originalString);
    expect(JSON.parse(decryptedString)).toEqual(originalObject);
  });
});
