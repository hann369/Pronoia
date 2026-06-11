import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';

// Load environmental variables from .env.local
process.env.NODE_ENV = 'production';
const projectDir = path.resolve(process.cwd());
loadEnvConfig(projectDir);

// Now dynamically import adminDb
const { adminDb } = await import('../lib/firebaseAdmin.js');

async function checkChat() {
  if (!adminDb) {
    console.error("Firestore Admin SDK could not be initialized. Check FIREBASE_SERVICE_ACCOUNT.");
    return;
  }

  console.log("Connected to Firestore. Querying chats involving 'hermes_agent_node'...");

  try {
    // 1. Find the chat
    const chatsSnap = await adminDb.collection("chats")
      .where("participants", "array-contains", "hermes_agent_node")
      .get();

    if (chatsSnap.empty) {
      console.log("No chats found with 'hermes_agent_node'.");
      return;
    }

    console.log(`Found ${chatsSnap.size} chat(s):`);
    for (const chatDoc of chatsSnap.docs) {
      const chatData = chatDoc.data();
      console.log(`\n--- Chat ID: ${chatDoc.id} ---`);
      console.log("Title:", chatData.title);
      console.log("Participants:", chatData.participants);
      console.log("Last Message:", JSON.stringify(chatData.lastMessage, null, 2));

      // 2. Fetch last 5 messages in this chat
      const msgsSnap = await adminDb.collection("chats")
        .doc(chatDoc.id)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(5)
        .get();

      console.log("\nLast 5 messages (newest first):");
      msgsSnap.docs.forEach(mDoc => {
        const mData = mDoc.data();
        console.log(`\n- Message ID: ${mDoc.id}`);
        console.log(`  Sender: ${mData.senderName} (${mData.senderUid})`);
        console.log(`  Time: ${mData.timestamp}`);
        if (mData.text) {
          console.log(`  Plaintext: "${mData.text}"`);
        } else if (mData.enc) {
          console.log(`  E2E Cipher Keys present for:`, Object.keys(mData.enc));
          console.log(`  Cipher details for 'hermes_agent_node':`, mData.enc.hermes_agent_node ? "YES" : "NO");
        } else if (mData.ciphertext) {
          console.log(`  Legacy Group Key Ciphertext: "${mData.ciphertext}"`);
        } else {
          console.log(`  Unknown message format:`, mData);
        }
      });
    }

  } catch (err) {
    console.error("Error querying chats:", err);
  }
}

checkChat();
