/**
 * Composable for client-side encryption using the Web Crypto API.
 * Inspired by Excalidraw's end-to-end encryption.
 * @see https://plus.excalidraw.com/blog/end-to-end-encryption
 */
export const useEncryption = () => {
  /**
   * Generates a 128-bit AES-GCM key and returns its JWK 'k' parameter.
   * This 'k' value is base64url encoded and safe to use in URL fragments.
   */
  const generateKey = async (): Promise<string> => {
    if (import.meta.server) return "";

    const key = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 128 },
      true,
      ["encrypt", "decrypt"],
    );

    const jwk = await window.crypto.subtle.exportKey("jwk", key);
    return jwk.k!;
  };

  /**
   * Encrypts a string using a JWK key string.
   * Returns an ArrayBuffer containing the encrypted data.
   * Uses a zero IV as suggested in the Excalidraw article for single-use keys.
   */
  const encryptData = async (data: string, k: string): Promise<ArrayBuffer> => {
    if (import.meta.server) {
      throw new Error("Encryption is only available on the client side");
    }

    const key = await window.crypto.subtle.importKey(
      "jwk",
      {
        k,
        alg: "A128GCM",
        ext: true,
        key_ops: ["encrypt", "decrypt"],
        kty: "oct",
      },
      { name: "AES-GCM", length: 128 },
      false,
      ["encrypt"],
    );

    const iv = new Uint8Array(12);
    const encoded = new TextEncoder().encode(data);

    return await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded,
    );
  };

  return {
    generateKey,
    encryptData,
  };
};

/**
 * Composable for client-side decryption using the Web Crypto API.
 */
export const useDecryption = () => {
  /**
   * Decrypts a Blob using a JWK key string.
   * Returns the decrypted data as a string.
   */
  const decryptBlob = async (blob: Blob, k: string): Promise<string> => {
    if (import.meta.server) {
      throw new Error("Decryption is only available on the client side");
    }

    const arrayBuffer = await blob.arrayBuffer();

    const key = await window.crypto.subtle.importKey(
      "jwk",
      {
        k,
        alg: "A128GCM",
        ext: true,
        key_ops: ["encrypt", "decrypt"],
        kty: "oct",
      },
      { name: "AES-GCM", length: 128 },
      false,
      ["decrypt"],
    );

    const iv = new Uint8Array(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      arrayBuffer,
    );

    return new TextDecoder().decode(new Uint8Array(decrypted));
  };

  return {
    decryptBlob,
  };
};
