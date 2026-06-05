const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } = require('firebase/auth');

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
  const emailA = `temp_a_${Date.now()}@pronoia.test`;
  const emailB = `temp_b_${Date.now()}@pronoia.test`;
  const password = "TemporaryPassword123!";
  
  console.log("Creating User B...");
  let credB = await createUserWithEmailAndPassword(auth, emailB, password);
  const uidB = credB.user.uid;
  console.log("User B created with UID:", uidB);
  
  // Set profile for B
  await setDoc(doc(db, 'users', uidB), {
    profile: { username: "tester_b", telegramId: "123456" }
  });
  
  // Sign out B
  await auth.signOut();
  
  console.log("Creating and signing in as User A...");
  let credA = await createUserWithEmailAndPassword(auth, emailA, password);
  const uidA = credA.user.uid;
  console.log("User A created and signed in with UID:", uidA);
  
  let success = false;
  try {
    console.log(`User A trying to directly read User B's doc: users/${uidB}...`);
    const snap = await getDoc(doc(db, 'users', uidB));
    if (snap.exists()) {
      console.log("SUCCESS! Directly read B's profile:", JSON.stringify(snap.data()));
      success = true;
    } else {
      console.log("Document does not exist, but no permission error.");
    }
  } catch (e) {
    console.error("FAILED to read B's document directly:", e.message);
  }
  
  // Clean up
  console.log("Cleaning up User A...");
  try {
    await deleteUser(auth.currentUser);
  } catch (e) { console.error(e); }
  
  console.log("Cleaning up User B...");
  try {
    await signInWithEmailAndPassword(auth, emailB, password);
    await deleteUser(auth.currentUser);
    console.log("Cleanup complete.");
  } catch (e) { console.error(e); }
}

check().catch(console.error);
