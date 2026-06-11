import pkgEnv from '@next/env';
import path from 'path';

// Load environmental variables
process.env.NODE_ENV = 'production';
const projectDir = path.resolve(process.cwd());
pkgEnv.loadEnvConfig(projectDir);

// Import libs
import { eciesEncryptText, importPublicKey } from '../lib/cryptoServer.js';
const { adminDb } = await import('../lib/firebaseAdmin.js');

async function testLiveWebhook() {
  if (!adminDb) {
    console.error("Firestore Admin SDK could not be initialized.");
    return;
  }

  const userUid = 'B8RE7nVZpiTtc1QzwUfyufc7mG22'; // Hannes
  const hermesUid = 'hermes_agent_node';
  const chatId = 'NdZqiX85cL9qWbL6PUyd';

  try {
    console.log("Fetching public keys from Firestore...");
    const userDoc = await adminDb.collection("users").doc(userUid).get();
    const userJwk = userDoc.exists ? userDoc.data().publicKey?.jwk : null;

    const hermesDoc = await adminDb.collection("users").doc(hermesUid).get();
    const hermesJwk = hermesDoc.exists ? hermesDoc.data().publicKey?.jwk : null;

    if (!userJwk || !hermesJwk) {
      console.error("Public keys missing in Firestore.");
      return;
    }

    console.log("Encrypting test message for Hermes...");
    const plaintext = "wie geht es dir";
    
    // Encrypt for Hermes
    const hermesPub = await importPublicKey(hermesJwk);
    const hermesCipher = await eciesEncryptText(plaintext, hermesPub);

    // Encrypt for Hannes (so Hannes can read it in the UI)
    const userPub = await importPublicKey(userJwk);
    const userCipher = await eciesEncryptText(plaintext, userPub);

    const ciphers = {
      [hermesUid]: hermesCipher,
      [userUid]: userCipher
    };

    console.log("Triggering live webhook on Vercel...");
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const url = "https://pronoia-3g6y.vercel.app/api/agent-webhook";

    const payload = {
      event: "hermes_trigger",
      source: "integration_test",
      chatId,
      participants: [userUid, hermesUid],
      message: {
        senderUid: userUid,
        senderName: "Integration Test",
        timestamp: new Date().toISOString(),
        enc: ciphers
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": webhookSecret
      },
      body: JSON.stringify(payload)
    });

    console.log("Webhook HTTP Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));

    if (data.ok) {
      console.log("✅ Webhook returned OK. Waiting 3 seconds, then checking Firestore for Hermes' reply...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      const msgsSnap = await adminDb.collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(3)
        .get();

      console.log("\nLast 3 messages in chat:");
      msgsSnap.docs.forEach(mDoc => {
        const mData = mDoc.data();
        console.log(`- Message ID: ${mDoc.id}`);
        console.log(`  Sender: ${mData.senderName} (${mData.senderUid})`);
        console.log(`  Time: ${mData.timestamp}`);
        if (mData.text) {
          console.log(`  Plaintext: "${mData.text}"`);
        } else if (mData.enc) {
          console.log(`  E2E Cipher Keys present for:`, Object.keys(mData.enc));
        }
      });
    } else {
      console.error("❌ Webhook reported failure.");
    }

  } catch (err) {
    console.error("Error during webhook test:", err);
  }
}

testLiveWebhook();
