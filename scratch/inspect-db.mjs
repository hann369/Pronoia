import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function inspect() {
  console.log("Fetching documents from 'users' collection...");
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${querySnapshot.size} documents in 'users' collection:\n`);
    querySnapshot.forEach(doc => {
      console.log(`Document ID: ${doc.id}`);
      console.log(`Data:`, JSON.stringify(doc.data(), null, 2));
      console.log("-----------------------------------------");
    });
  } catch (err) {
    console.error("Error fetching documents:", err);
  }
}

inspect();
