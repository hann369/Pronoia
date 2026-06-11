// lib/cryptoServer.js — Server-side E2E cryptographic helper using Web Crypto API
// Compatible with the browser-native E2E helper (lib/crypto.js) but safe for Next.js API/Vercel serverless.

const subtle = globalThis.crypto?.subtle;

if (!subtle) {
  throw new Error("Web Crypto API (subtle) not available in this Node.js environment");
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Helper to convert base64 to arrayBuffer (Node-safe)
function base64ToArrayBuffer(base64) {
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// Helper to convert arrayBuffer to base64 (Node-safe)
function arrayBufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

// --- Import public key from JWK ---
export async function importPublicKey(jwk) {
  return await subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    []
  );
}

// --- Import private key from JWK ---
export async function importPrivateKey(jwk) {
  return await subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );
}

// --- Derive Shared Secret Key (for ECIES) ---
export async function deriveSharedSecret(privateKey, publicKey) {
  return await subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// --- ECIES Decrypt text directly for own private key ---
export async function eciesDecryptText(encObj, ownPrivateKey) {
  if (!encObj?.ephemPub || !encObj?.ct || !encObj?.iv) throw new Error("Invalid ECIES cipher object");

  const ephemPub = await importPublicKey(encObj.ephemPub);
  const sharedSecret = await deriveSharedSecret(ownPrivateKey, ephemPub);

  const decrypted = await subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(encObj.iv)) },
    sharedSecret,
    base64ToArrayBuffer(encObj.ct)
  );
  return textDecoder.decode(decrypted);
}

// --- ECIES Encrypt text directly for recipient's public key ---
export async function eciesEncryptText(plaintext, recipientPublicKey) {
  const ephemKeyPair = await subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const sharedSecret = await deriveSharedSecret(ephemKeyPair.privateKey, recipientPublicKey);

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedSecret,
    textEncoder.encode(plaintext)
  );

  const ephemPubJwk = await subtle.exportKey("jwk", ephemKeyPair.publicKey);

  return {
    ct: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
    ephemPub: {
      kty: ephemPubJwk.kty,
      crv: ephemPubJwk.crv,
      x: ephemPubJwk.x,
      y: ephemPubJwk.y
    }
  };
}
