const fs = require('fs');
const path = require('path');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
});

// Initialize Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log("=== USERS ===");
    usersSnap.docs.forEach(doc => {
      console.log(`ID: ${doc.id}, profile:`, JSON.stringify(doc.data().profile));
    });

    const vaultSnap = await getDocs(collection(db, 'vault_items'));
    console.log("=== VAULT ITEMS ===");
    vaultSnap.docs.forEach(doc => {
      console.log(`ID: ${doc.id}, user_id: ${doc.data().user_id}, title: ${doc.data().title}, type: ${doc.data().type}`);
    });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
