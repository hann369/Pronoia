import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Parse .env.local keys
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const config = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*NEXT_PUBLIC_FIREBASE_([A-Z_]+)\s*=\s*(.+?)\s*$/);
  if (match) {
    const key = match[1].toLowerCase().replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    config[key] = match[2];
  }
});

console.log("Firebase config loaded:", config);

const app = initializeApp(config);
const db = getFirestore(app);

const telegramId = 5996717439;

function getTelegramUserQuery(tgId) {
  const idArray = [String(tgId)];
  const parsed = parseInt(tgId);
  if (!isNaN(parsed) && !idArray.includes(parsed)) {
    idArray.push(parsed);
  }
  console.log("Constructing query for Telegram ID in array:", idArray);
  return query(collection(db, "users"), where("profile.telegramId", "in", idArray));
}

async function runQuery() {
  console.log("Running query on 'users' collection...");
  try {
    const q = getTelegramUserQuery(telegramId);
    const querySnapshot = await getDocs(q);
    console.log(`Query succeeded! Found ${querySnapshot.size} documents:\n`);
    querySnapshot.forEach(doc => {
      console.log(`Document ID: ${doc.id}`);
      console.log(`Data:`, JSON.stringify(doc.data(), null, 2));
      console.log("-----------------------------------------");
    });
  } catch (err) {
    console.error("Query failed with error:", err);
  }
}

runQuery();
