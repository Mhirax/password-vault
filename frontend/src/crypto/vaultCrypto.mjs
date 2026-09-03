const PBKDF2_ITERATIONS = 600_000;
const AES_TAG_LENGTH_BYTES = 16;

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateSalt() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

async function importMasterPasswordKey(masterPassword) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits']
  );
}

// Stretches the master password into 256 bits of key material. This is the
// only function that touches the plaintext master password - everything
// downstream works with derived bits, and none of it ever leaves the browser.
export async function deriveMasterKeyBits(masterPassword, saltB64) {
  const baseKey = await importMasterPasswordKey(masterPassword);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );
  return new Uint8Array(bits);
}

async function importMasterKeyForHkdf(masterKeyBits) {
  return crypto.subtle.importKey('raw', masterKeyBits, 'HKDF', false, ['deriveKey', 'deriveBits']);
}

// HKDF with distinct `info` labels turns one master key into two keys that are
// computationally independent - knowing one reveals nothing about the other,
// even though both come from the same master password.
export async function deriveEncryptionKey(masterKeyBits, saltB64) {
  const hkdfKey = await importMasterKeyForHkdf(masterKeyBits);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: base64ToBytes(saltB64),
      info: new TextEncoder().encode('vault-encryption-key'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// The value sent to the server at login to prove knowledge of the master
// password, without ever exposing the master password or the encryption key.
export async function deriveAuthProof(masterKeyBits, saltB64) {
  const hkdfKey = await importMasterKeyForHkdf(masterKeyBits);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: base64ToBytes(saltB64),
      info: new TextEncoder().encode('vault-auth-proof'),
    },
    hkdfKey,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

export async function encryptEntry(plaintext, encryptionKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const combined = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: AES_TAG_LENGTH_BYTES * 8 },
      encryptionKey,
      encoded
    )
  );
  const ciphertext = combined.slice(0, combined.length - AES_TAG_LENGTH_BYTES);
  const authTag = combined.slice(combined.length - AES_TAG_LENGTH_BYTES);
  return {
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    authTag: bytesToBase64(authTag),
  };
}

export async function decryptEntry({ ciphertext, iv, authTag }, encryptionKey) {
  const combined = new Uint8Array([...base64ToBytes(ciphertext), ...base64ToBytes(authTag)]);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv), tagLength: AES_TAG_LENGTH_BYTES * 8 },
    encryptionKey,
    combined
  );
  return new TextDecoder().decode(decrypted);
}
