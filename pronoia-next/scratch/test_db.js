// scratch/test_db.js
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

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
  console.log("Fetching users collection...");
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((doc) => {
      console.log(`Document ID: ${doc.id}`);
      const data = doc.data();
      console.log("Profile:", JSON.stringify(data.profile, null, 2));
      console.log("Circadian Mode:", data.circadianMode);
      console.log("BlockIdx:", data.blockIdx);
      console.log("Blocks count:", data.blocks?.length);
      if (data.blocks) {
        console.log("Blocks snippet:", JSON.stringify(data.blocks.map(b => ({
          title: b.title,
          startTime: b.startTime,
          start_time: b.start_time,
          duration: b.duration,
          pillar: b.pillar
        })), null, 2));
      }
    });
  } catch (err) {
    console.error("Error reading users:", err);
  }
}

check();
