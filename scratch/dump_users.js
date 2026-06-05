const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const fs = require('fs');
const path = require('path');

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
const auth = getAuth(app);

async function dump() {
  console.log("Attempting to list all users from Firestore 'users' collection...");
  try {
    const snap = await getDocs(collection(db, "users"));
    console.log(`\nSUCCESS! Found ${snap.size} user documents:\n`);
    
    const results = [];
    snap.forEach(doc => {
      const data = doc.data();
      const profile = data.profile || {};
      results.push({
        uid: doc.id,
        username: profile.username || 'Unnamed',
        telegramId: profile.telegramId || 'None',
        email: profile.email || 'None'
      });
    });
    
    console.table(results);
  } catch (e) {
    console.error("\n❌ FAILED to list users collection:");
    console.error(e.message);
    console.log("\nHinweis: Um diese Liste abzurufen, musst du temporär in deinen Firestore-Regeln das Auflisten erlauben:");
    console.log("allow list: if request.auth != null;");
  }
}

// Check if email and password are provided as command line arguments to login
const email = process.argv[2];
const password = process.argv[3];

if (email && password) {
  console.log(`Logging in as ${email}...`);
  signInWithEmailAndPassword(auth, email, password)
    .then(() => dump())
    .catch(console.error);
} else {
  dump();
}
