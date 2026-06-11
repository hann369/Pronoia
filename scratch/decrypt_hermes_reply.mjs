import pkgEnv from '@next/env';
import path from 'path';

// Load environmental variables
process.env.NODE_ENV = 'production';
const projectDir = path.resolve(process.cwd());
pkgEnv.loadEnvConfig(projectDir);

import { eciesDecryptText, importPrivateKey } from '../lib/cryptoServer.js';
const { adminDb } = await import('../lib/firebaseAdmin.js');

async function decryptReply() {
  if (!adminDb) {
    console.error("Firestore Admin SDK could not be initialized.");
    return;
  }

  const chatId = 'NdZqiX85cL9qWbL6PUyd';
  const messageId = 'HJDoUD13gMNzpceDkCvG'; // Hermes reply ID from the test

  try {
    console.log(`Fetching message ${messageId} from Firestore...`);
    const doc = await adminDb.collection("chats")
      .doc(chatId)
      .collection("messages")
      .doc(messageId)
      .get();

    if (!doc.exists) {
      console.error("Message not found.");
      return;
    }

    const data = doc.data();
    const encObj = data.enc?.hermes_agent_node;
    if (!encObj) {
      console.error("E2E cipher object for 'hermes_agent_node' not found.");
      return;
    }

    console.log("E2E Cipher Object:", JSON.stringify(encObj, null, 2));

    console.log("Importing Hermes private key...");
    const prvKeyJwk = JSON.parse(process.env.HERMES_PRIVATE_KEY);
    const prvKey = await importPrivateKey(prvKeyJwk);

    console.log("Decrypting message...");
    const plaintext = await eciesDecryptText(encObj, prvKey);

    console.log("\nDecrypted Plaintext Response from Hermes:");
    console.log(`"${plaintext}"`);
    console.log("\n✅ E2E decryption test successful!");

  } catch (err) {
    console.error("Error during E2E decryption test:", err);
  }
}

decryptReply();
