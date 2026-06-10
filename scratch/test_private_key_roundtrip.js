// scratch/test_private_key_roundtrip.js
const { webcrypto } = require('crypto');
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Helpers
function base64ToArrayBuffer(base64) {
  const Buffer = require('buffer').Buffer;
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function arrayBufferToBase64(buffer) {
  const Buffer = require('buffer').Buffer;
  return Buffer.from(buffer).toString('base64');
}

async function runTest() {
  console.log("Testing private key export/import roundtrip...");
  try {
    // 1. Generate key pair
    const keyPair = await globalThis.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true,
      ["deriveKey", "deriveBits"]
    );
    
    // 2. Export private key as JWK and base64 encode it
    const jwkPrv = await globalThis.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    console.log("Exported JWK key_ops:", jwkPrv.key_ops);
    
    const base64Jwk = Buffer.from(JSON.stringify(jwkPrv)).toString('base64');
    
    // 3. Import private key back from base64 JWK
    const decodedJwk = JSON.parse(Buffer.from(base64Jwk, 'base64').toString('utf8'));
    const importedPrivateKey = await globalThis.crypto.subtle.importKey(
      "jwk",
      decodedJwk,
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true,
      ["deriveKey", "deriveBits"]
    );
    
    console.log("🟢 SUCCESS! Private key exported and imported back successfully.");
  } catch (err) {
    console.error("❌ FAILURE! Private key export/import failed:", err);
  }
}

runTest();
