import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export async function GET(req) {
  const debugInfo = {
    envProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseInitialized: !!db,
    appOptions: db ? db.app?.options : null,
    testQueryResults: null,
    directDocFetch: null,
    error: null
  };

  try {
    if (!db) {
      debugInfo.error = "Firebase DB not initialized";
      return NextResponse.json(debugInfo);
    }

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
