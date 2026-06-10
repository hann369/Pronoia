// scratch/test_webcrypto.js
const { webcrypto } = require('crypto');
// Polyfill global crypto for standard Web Crypto API code compatibility
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Helper to convert base64 to arrayBuffer
function base64ToArrayBuffer(base64) {
  const Buffer = require('buffer').Buffer;
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// Helper to convert arrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const Buffer = require('buffer').Buffer;
  return Buffer.from(buffer).toString('base64');
}

// Key pair generation (ECDH)
async function generateKeyPair() {
  return await globalThis.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );
}

// Derive Shared Secret Key
async function deriveSharedSecret(privateKey, publicKey) {
  return await globalThis.crypto.subtle.deriveKey(
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

// Encrypt plaintext
async function encryptMessage(sharedKey, plaintext) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = textEncoder.encode(plaintext);
  
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
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

// Decrypt ciphertext
async function decryptMessage(sharedKey, ciphertextBase64, ivBase64) {
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);

  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedKey,
    ciphertext
  );

  return textDecoder.decode(decryptedBuffer);
}

async function runTest() {
  console.log("=== Web Crypto E2E Encryption Test ===");
  try {
    console.log("1. Generating key pairs for User A and User B...");
    const keyPairA = await generateKeyPair();
    const keyPairB = await generateKeyPair();
    
    console.log("2. Exporting and importing public keys (simulating Firestore transfer)...");
    const jwkPubA = await globalThis.crypto.subtle.exportKey("jwk", keyPairA.publicKey);
    const jwkPubB = await globalThis.crypto.subtle.exportKey("jwk", keyPairB.publicKey);
    
    const importedPubA = await globalThis.crypto.subtle.importKey(
      "jwk",
      jwkPubA,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
    const importedPubB = await globalThis.crypto.subtle.importKey(
      "jwk",
      jwkPubB,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
    
    console.log("3. Deriving shared secrets on both sides...");
    const sharedKeyA = await deriveSharedSecret(keyPairA.privateKey, importedPubB);
    const sharedKeyB = await deriveSharedSecret(keyPairB.privateKey, importedPubA);
    
    const secretMessage = "Circadian bio-fuel sync active: 100%";
    console.log(`4. User A encrypts message: "${secretMessage}"`);
    const encrypted = await encryptMessage(sharedKeyA, secretMessage);
    console.log("   Ciphertext (Base64):", encrypted.ciphertext);
    console.log("   IV (Base64):        ", encrypted.iv);
    
    console.log("5. User B decrypts the message...");
    const decrypted = await decryptMessage(sharedKeyB, encrypted.ciphertext, encrypted.iv);
    console.log(`   Decrypted Text: "${decrypted}"`);
    
    if (decrypted === secretMessage) {
      console.log("\n🟢 SUCCESS! E2E Encryption and Decryption verified successfully in this environment.");
    } else {
      console.log("\n❌ FAILURE! Decrypted text does not match original message.");
    }
  } catch (err) {
    console.error("\n❌ ERROR during E2E test run:", err);
  }
}

runTest();
