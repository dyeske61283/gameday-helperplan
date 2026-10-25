/**
 * Composable for client-side encryption using the Web Crypto API.
 * Inspired by Excalidraw's end-to-end encryption.
 * @see https://plus.excalidraw.com/blog/end-to-end-encryption
 */
export function useEncryption() {
  const formatPrefix = "v1.";

  /**
   * Generates a 128-bit AES-GCM key and returns its JWK 'k' parameter.
   * This 'k' value is base64url encoded and safe to use in URL fragments.
   */
  const generateKey = async (): Promise<string> => {
    if (import.meta.server)
      return "";

    const key = await globalThis.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 128 },
      true,
      ["encrypt", "decrypt"],
    );

    const jwk = await globalThis.crypto.subtle.exportKey("jwk", key);
    return jwk.k!;
  };

  /**
   * Encrypts a string using a JWK key string.
   * Returns a versioned base64 payload containing the IV and encrypted data.
   */
  const encryptData = async (data: string, k: string): Promise<string> => {
    if (import.meta.server) {
      throw new Error("Encryption is only available on the client side");
    }

    const key = await globalThis.crypto.subtle.importKey(
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

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);

    const encrypted = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded,
    );

    const payload = new Uint8Array(iv.length + encrypted.byteLength);
    payload.set(iv);
    payload.set(new Uint8Array(encrypted), iv.length);

    return `${formatPrefix}${btoa(String.fromCharCode(...payload))}`;
  };

  return {
    generateKey,
    encryptData,
  };
}

/**
 * Composable for client-side decryption using the Web Crypto API.
 */
export function useDecryption() {
  const formatPrefix = "v1.";

  /**
   * Decrypts a Blob using a JWK key string.
   * Returns the decrypted data as a string.
   */
  const decryptBlob = async (blob: string, k: string): Promise<string> => {
    if (import.meta.server) {
      throw new Error("Decryption is only available on the client side");
    }

    const isVersioned = blob.startsWith(formatPrefix);
    const binaryString = atob(isVersioned ? blob.slice(formatPrefix.length) : blob);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const key = await globalThis.crypto.subtle.importKey(
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

    const iv = isVersioned ? bytes.slice(0, 12) : new Uint8Array(12);
    const ciphertext = isVersioned ? bytes.slice(12) : bytes;

    const decrypted = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(new Uint8Array(decrypted));
  };

  return {
    decryptBlob,
  };
}
