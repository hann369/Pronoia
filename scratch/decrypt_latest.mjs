import pkgEnv from '@next/env';
import path from 'path';

// Load environmental variables
process.env.NODE_ENV = 'production';
const projectDir = path.resolve(process.cwd());
pkgEnv.loadEnvConfig(projectDir);

import { eciesDecryptText, importPrivateKey } from '../lib/cryptoServer.js';
const { adminDb } = await import('../lib/firebaseAdmin.js');

async function decryptLatest() {
  if (!adminDb) {
    console.error("Firestore Admin SDK could not be initialized.");
    return;
  }

  const chatId = 'NdZqiX85cL9qWbL6PUyd';
  try {
    const msgsSnap = await adminDb.collection("chats")
      .doc(chatId)
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    if (msgsSnap.empty) {
      console.error("No messages found in chat.");
      return;
    }

    const doc = msgsSnap.docs.find(d => d.data().senderUid === "hermes_agent_node");
    if (!doc) {
      console.error("No recent messages found from Hermes.");
      return;
    }
    const data = doc.data();
    console.log(`Latest Hermes Message ID: ${doc.id}`);
    console.log(`Timestamp: ${data.timestamp}`);

    const encObj = data.enc?.hermes_agent_node;
    if (!encObj) {
      if (data.text) {
        console.log(`Plaintext message: "${data.text}"`);
        return;
      }
      console.error("E2E cipher object for 'hermes_agent_node' not found.");
      return;
    }

    const prvKeyJwk = JSON.parse(process.env.HERMES_PRIVATE_KEY);
    const prvKey = await importPrivateKey(prvKeyJwk);

    const plaintext = await eciesDecryptText(encObj, prvKey);
    console.log(`\nDecrypted Response: "${plaintext}"`);

  } catch (err) {
    console.error("Error during decryption:", err);
  }
}

decryptLatest();
