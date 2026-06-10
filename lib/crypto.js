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

// --- Get Public Key JWK from Private Key ---
export async function getPublicKeyJwkFromPrivateKey(privateKey) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
  return {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y
  };
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
  try {
    const db = await openDB();
    const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(jwk, uid);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
    // Also save to localStorage as a redundant fallback
    window.localStorage.setItem(`pronoia_prv_${uid}`, JSON.stringify(jwk));
    return true;
  } catch (err) {
    console.warn("[Crypto] IndexedDB store failed, falling back to localStorage:", err);
    try {
      const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
      window.localStorage.setItem(`pronoia_prv_${uid}`, JSON.stringify(jwk));
      return true;
    } catch (localErr) {
      console.error("[Crypto] localStorage store failed too:", localErr);
    }
  }
}

export async function loadLocalPrivateKey(uid) {
  if (typeof window === 'undefined') return null;
  let jwk = null;

  // 1. Try IndexedDB
  try {
    const db = await openDB();
    jwk = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(uid);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn("[Crypto] IndexedDB load failed, trying localStorage fallback:", err);
  }

  // 2. Try localStorage if IndexedDB returned null or failed
  if (!jwk) {
    try {
      const stored = window.localStorage.getItem(`pronoia_prv_${uid}`);
      if (stored) {
        jwk = JSON.parse(stored);
      }
    } catch (localErr) {
      console.error("[Crypto] localStorage load failed:", localErr);
    }
  }

  if (!jwk) return null;

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
    return key;
  } catch (err) {
    console.error("[Crypto] Error importing private key from JWK:", err);
    return null;
  }
}

// --- Ephemeral-Static E2E Key Wrapping (ECIES) ---
export async function wrapGroupKeyNew(groupKey, recipientPublicKey) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");

  // 1. Generate ephemeral ECDH keypair
  const ephemKeyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  // 2. Derive shared secret between ephemeral private key and recipient's public key
  const sharedSecret = await deriveSharedSecret(ephemKeyPair.privateKey, recipientPublicKey);

  // 3. Export raw group key
  const rawKey = await window.crypto.subtle.exportKey("raw", groupKey);

  // 4. Encrypt raw key with derived shared secret using AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedSecret,
    rawKey
  );

  // 5. Export ephemeral public key to JWK
  const ephemPubJwk = await exportPublicKey(ephemKeyPair.publicKey);

  return {
    wrappedKey: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv),
    ephemPub: ephemPubJwk
  };
}

export async function unwrapGroupKeyNew(wrappedKeyInfo, ownPrivateKey) {
  if (!isSubtleCryptoSupported()) throw new Error("SubtleCrypto not supported");
  if (!wrappedKeyInfo.ephemPub) throw new Error("Invalid wrapped key info: missing ephemeral public key");

  // 1. Import ephemeral public key
  const ephemPub = await importPublicKey(wrappedKeyInfo.ephemPub);

  // 2. Derive shared secret between recipient private key and ephemeral public key
  const sharedSecret = await deriveSharedSecret(ownPrivateKey, ephemPub);

  // 3. Decrypt raw key bytes
  const iv = new Uint8Array(base64ToArrayBuffer(wrappedKeyInfo.iv));
  const wrappedKeyBytes = base64ToArrayBuffer(wrappedKeyInfo.wrappedKey);

  const decryptedRawKey = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedSecret,
    wrappedKeyBytes
  );

  // 4. Import decrypted key as CryptoKey
  return await window.crypto.subtle.importKey(
    "raw",
    decryptedRawKey,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

