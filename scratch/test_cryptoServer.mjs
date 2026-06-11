import { importPrivateKey, importPublicKey, eciesEncryptText, eciesDecryptText } from '../lib/cryptoServer.js';

async function runTest() {
  console.log("Starting E2E server-side crypto test...");
  
  // JWK for Hermes companion (from hermes_identity.json)
  const hermesIdentityJwk = {
    "kty": "EC",
    "crv": "P-256",
    "x": "tji4RVhDujg-BI1W3xeGAwmq2gZSfkwSWmPIX_S3aNQ",
    "y": "3Da6Xgz8p_JqIKdzGY6By8HWoQG_aPu--x5RgP_mMAQ",
    "d": "Q-j4-exO1-x6Y22OxhvdqIdZ1t0KseDpAXGXYq-zY0w"
  };

  const textToEncrypt = "Hallo Hermes, wie optimiere ich meinen Fokus-Block heute?";
  console.log("Plaintext to encrypt:", textToEncrypt);

  try {
    // 1. Import keys
    const privateKey = await importPrivateKey(hermesIdentityJwk);
    const publicKey = await importPublicKey({
      kty: hermesIdentityJwk.kty,
      crv: hermesIdentityJwk.crv,
      x: hermesIdentityJwk.x,
      y: hermesIdentityJwk.y
    });

    console.log("Keys imported successfully.");

    // 2. Encrypt text (simulates client/other user encrypting for Hermes)
    console.log("Encrypting...");
    const cipherObj = await eciesEncryptText(textToEncrypt, publicKey);
    console.log("Encrypted object:", JSON.stringify(cipherObj, null, 2));

    // 3. Decrypt text (simulates Hermes decrypting the message)
    console.log("Decrypting...");
    const decryptedText = await eciesDecryptText(cipherObj, privateKey);
    console.log("Decrypted text:", decryptedText);

    if (decryptedText === textToEncrypt) {
      console.log("✅ SUCCESS: Decrypted text matches the original!");
    } else {
      console.error("❌ FAILURE: Decrypted text does not match!");
    }

  } catch (err) {
    console.error("❌ Error during E2E test:", err);
  }
}

runTest();
