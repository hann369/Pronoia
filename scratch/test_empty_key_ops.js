// scratch/test_empty_key_ops.js
const { webcrypto } = require('crypto');
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const mockJwk = {
  crv: "P-256",
  ext: true,
  key_ops: [], // Empty array, matching Firestore proto representation
  kty: "EC",
  x: "NZJSAW-sE4ZzuUqXpnI9pFk_FCWeVcC7z9Eyu1I_cUQ",
  y: "Nx3_oXtwCTDfNXmaeu0Ab9QXTDv9uqMZqSEUtTLAWsw"
};

async function testImport() {
  console.log("Testing import of public key JWK with key_ops: []...");
  try {
    const key = await globalThis.crypto.subtle.importKey(
      "jwk",
      mockJwk,
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true,
      []
    );
    console.log("🟢 SUCCESS! Public key imported successfully with empty key_ops array.");
  } catch (err) {
    console.error("❌ FAILURE! Public key import failed:", err);
  }
}

testImport();
