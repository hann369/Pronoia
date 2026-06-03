import { NextResponse } from "next/server";
import { getApps, initializeApp } from "firebase/app";
import { doc, getDoc, collection, query, where, getDocs, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function GET(req) {
  const debugInfo = {
    firebaseInitialized: false,
    testQueryResults: null,
    directDocFetch: null,
    error: null
  };

  try {
    // Initialize a separate app to avoid conflict with the default app
    const apps = getApps();
    const existingDebugApp = apps.find(a => a.name === "debug-app");
    const app = existingDebugApp || initializeApp(firebaseConfig, "debug-app");
    
    // Initialize Firestore with experimentalForceLongPolling: true
    let db;
    try {
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true
      });
    } catch (err) {
      // If already started, get the existing instance
      const { getFirestore } = await import("firebase/firestore");
      db = getFirestore(app);
    }
    
    debugInfo.firebaseInitialized = true;

    // 1. Direct fetch of document ID B8RE7nVZpiTtc1QzwUfyufc7mG22
    try {
      const docRef = doc(db, "users", "B8RE7nVZpiTtc1QzwUfyufc7mG22");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        debugInfo.directDocFetch = {
          exists: true,
          id: docSnap.id,
          profileTelegramId: docSnap.data()?.profile?.telegramId,
          hasProfile: !!docSnap.data()?.profile
        };
      } else {
        debugInfo.directDocFetch = {
          exists: false,
          msg: "Document B8RE7nVZpiTtc1QzwUfyufc7mG22 not found"
        };
      }
    } catch (e) {
      debugInfo.directDocFetch = {
        error: e.message
      };
    }

    // 2. Query for telegramId 5996717439
    try {
      const idArray = [5996717439, "5996717439"];
      const q = query(collection(db, "users"), where("profile.telegramId", "in", idArray));
      const querySnapshot = await getDocs(q);
      const docs = [];
      querySnapshot.forEach(docSnap => {
        docs.push({
          id: docSnap.id,
          profileTelegramId: docSnap.data()?.profile?.telegramId
        });
      });
      debugInfo.testQueryResults = {
        size: querySnapshot.size,
        docs
      };
    } catch (e) {
      debugInfo.testQueryResults = {
        error: e.message
      };
    }

  } catch (e) {
    debugInfo.error = e.message;
  }

  return NextResponse.json(debugInfo);
}
