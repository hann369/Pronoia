import pkgEnv from '@next/env';
import path from 'path';

process.env.NODE_ENV = 'production';
const projectDir = path.resolve(process.cwd());
pkgEnv.loadEnvConfig(projectDir);

import { eciesDecryptText, importPrivateKey } from '../lib/cryptoServer.js';
const { adminDb } = await import('../lib/firebaseAdmin.js');

async function printRecentChat() {
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
      .limit(15)
      .get();

    if (msgsSnap.empty) {
      console.log("No messages in chat.");
      return;
    }

    const prvKeyJwk = JSON.parse(process.env.HERMES_PRIVATE_KEY);
    const prvKey = await importPrivateKey(prvKeyJwk);

    const reversedDocs = [...msgsSnap.docs].reverse();
    for (const doc of reversedDocs) {
      const data = doc.data();
      let text = data.text || "";
      let status = "plaintext";
      if (data.enc) {
        status = `encrypted (keys: ${Object.keys(data.enc).join(', ')})`;
        const cipher = data.enc.hermes_agent_node;
        if (cipher) {
          try {
            text = await eciesDecryptText(cipher, prvKey);
          } catch (e) {
            text = `[Decryption Failed: ${e.message}]`;
          }
        } else {
          text = "[E2E Encrypted, no hermes_agent_node cipher]";
        }
      }
      console.log(`[${data.timestamp}] Sender: ${data.senderName} (${data.senderUid}) - MsgId: ${doc.id} - ${status}`);
      console.log(`  "${text}"`);
    }

  } catch (err) {
    console.error("Error during chat decryption:", err);
  }
}

printRecentChat();
