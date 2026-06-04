// lib/crypto.js — Browser-native E2E cryptographic helper using Web Crypto API

// Helper to check if window and crypto are available (SSR safety)
const isSubtleCryptoSupported = () => 
  typeof window !== 'undefined' && window.crypto && window.crypto.subtle;

// Helper to convert base64 to arrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper to convert arrayBuffer to base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert string to UTF-8 Uint8Array
const textEncoder = typeof window !== 'undefined' ? new TextEncoder() : null;
const textDecoder = typeof window !== 'undefined' ? new TextDecoder() : null;

// --- Key pair generation (ECDH) ---
export async function generateKeyPair() {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported in this environment");
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );
}

// --- Export public key to JWK ---
export async function exportPublicKey(key) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  return await window.crypto.subtle.exportKey("jwk", key);
}

// --- Import public key from JWK ---
export async function importPublicKey(jwk) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  return await window.crypto.subtle.importKey(
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

// --- Export private key to base64 JWK (for backups) ---
export async function exportPrivateKey(key) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  const jwk = await window.crypto.subtle.exportKey("jwk", key);
  return window.btoa(JSON.stringify(jwk));
}

// --- Import private key from base64 JWK (for backups) ---
export async function importPrivateKey(base64Jwk) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  const jwk = JSON.parse(window.atob(base64Jwk));
  return await window.crypto.subtle.importKey(
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

// --- Derive Shared Secret Key (for 1:1 DMs) ---
export async function deriveSharedSecret(privateKey, publicKey) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  return await window.crypto.subtle.deriveKey(
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

// --- Encrypt plaintext using AES-GCM ---
export async function encryptMessage(sharedKey, plaintext) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = textEncoder.encode(plaintext);
  
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedKey,
    encodedText
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv)
  };
}

// --- Decrypt ciphertext using AES-GCM ---
export async function decryptMessage(sharedKey, ciphertextBase64, ivBase64) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedKey,
    ciphertext
  );

  return textDecoder.decode(decryptedBuffer);
}

// --- Generate a random Group AES Key ---
export async function generateGroupKey() {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// --- Wrap (encrypt) the Group Key with a Member's Public ECDH Key ---
export async function wrapGroupKey(groupKey, memberPublicKey, ownPrivateKey) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  
  // 1. Derive shared secret with the member
  const sharedSecret = await deriveSharedSecret(ownPrivateKey, memberPublicKey);
  
  // 2. Export raw group key bytes
  const rawGroupKey = await window.crypto.subtle.exportKey("raw", groupKey);
  
  // 3. Encrypt raw group key bytes with the shared secret
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const wrappedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedSecret,
    rawGroupKey
  );

  return {
    wrappedKey: arrayBufferToBase64(wrappedBuffer),
    iv: arrayBufferToBase64(iv)
  };
}

// --- Unwrap (decrypt) the Group Key using Own Private Key + Sender's Public Key ---
export async function unwrapGroupKey(wrappedKeyBase64, ivBase64, senderPublicKey, ownPrivateKey) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  
  // 1. Derive shared secret with sender
  const sharedSecret = await deriveSharedSecret(ownPrivateKey, senderPublicKey);
  
  // 2. Decrypt wrapped key bytes
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const wrappedKeyBytes = base64ToArrayBuffer(wrappedKeyBase64);
  
  const decryptedRawKey = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedSecret,
    wrappedKeyBytes
  );

  // 3. Import decrypted key as CryptoKey
  return await window.crypto.subtle.importKey(
    "raw",
    decryptedRawKey,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

// --- IndexedDB Local Key Storage Helpers ---
const DB_NAME = "pronoia_crypto_db";
const DB_VERSION = 1;
const STORE_NAME = "private_keys";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function storeLocalPrivateKey(uid, privateKey) {
  if (typeof window === 'undefined') return;
  const db = await openDB();
  const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(jwk, uid);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function loadLocalPrivateKey(uid) {
  if (typeof window === 'undefined') return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(uid);
    request.onsuccess = async (e) => {
      const jwk = e.target.result;
      if (!jwk) {
        resolve(null);
        return;
      }
      try {
        const key = await window.crypto.subtle.importKey(
          "jwk",
          jwk,
          {
            name: "ECDH",
            namedCurve: "P-256"
          },
          true,
          ["deriveKey", "deriveBits"]
        );
        resolve(key);
      } catch (err) {
        reject(err);
      }
    };
    request.onerror = (e) => reject(e.target.error);
  });
}
