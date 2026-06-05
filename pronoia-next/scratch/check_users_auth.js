const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser } = require('firebase/auth');

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
const auth = getAuth(app);

async function check() {
  const email = `temp_diag_${Date.now()}@pronoia.test`;
  const password = "TemporaryPassword123!";
  
  console.log("Creating temporary diagnostic user...");
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Successfully authenticated as:", userCredential.user.uid);
  } catch (e) {
    console.error("Failed to create temporary user:", e.message);
    return;
  }

  try {
    console.log("Fetching users from Firestore (authenticated)...");
    const snap = await getDocs(collection(db, "users"));
    console.log(`Found ${snap.size} user documents.`);
    snap.forEach(d => {
      const data = d.data();
      console.log(`- UID: ${d.id}`);
      console.log(`  Profile:`, JSON.stringify(data.profile || null));
    });
  } catch (e) {
    console.error("Failed to query users collection even when authenticated:", e.message);
  } finally {
    console.log("Cleaning up diagnostic user...");
    try {
      await deleteUser(auth.currentUser);
      console.log("Cleanup complete.");
    } catch (e) {
      console.error("Failed to delete temp user:", e.message);
    }
  }
}

check().catch(console.error);
