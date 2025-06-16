// should be password or other low-entropy input
function getKeyMaterial(input: string) {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(input),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
}

export async function encrypt(plaintext: BufferSource, salt: BufferSource, iv: BufferSource, keyInput: string) {
  const keyMaterial = await getKeyMaterial(keyInput);
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  return window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
}

export async function decrypt(ciphertext: BufferSource, salt: BufferSource, iv: BufferSource, keyInput: string) {
  const keyMaterial = await getKeyMaterial(keyInput);
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  return window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}