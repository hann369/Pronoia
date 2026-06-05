const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyByRct0T6sEQBsqrJA_oQpSDrDcnnb6Qzo",
  authDomain: "pronoia-data.firebaseapp.com",
  projectId: "pronoia-data",
  storageBucket: "pronoia-data.firebasestorage.app",
  messagingSenderId: "937205133444",
  appId: "1:937205133444:web:44d40c344e7e02dc0252d1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("Fetching users from Firestore...");
  const snap = await getDocs(collection(db, "users"));
  console.log(`Found ${snap.size} user documents.`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`- UID: ${d.id}`);
    console.log(`  Profile:`, JSON.stringify(data.profile || null));
    console.log(`  AppConfig:`, JSON.stringify(data.appConfig || null));
    if (data.publicKey) {
      console.log(`  Has E2E Public Key: true`);
    } else {
      console.log(`  Has E2E Public Key: false`);
    }
  });
}

check().catch(console.error);
