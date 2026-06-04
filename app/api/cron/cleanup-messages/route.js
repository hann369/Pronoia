// app/api/cron/cleanup-messages/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

export async function GET(request) {
  // Ensure Firebase is initialized
  if (!db) {
    return NextResponse.json({ error: "Firebase client is not configured" }, { status: 500 });
  }

  // Authorization check (optional but recommended for cron jobs)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chatsSnap = await getDocs(collection(db, 'chats'));
    let deletedCount = 0;
    const now = new Date().toISOString();

    for (const chatDoc of chatsSnap.docs) {
      const messagesRef = collection(db, 'chats', chatDoc.id, 'messages');
      const expiredQuery = query(messagesRef, where('expiresAt', '<=', now));
      const expiredSnap = await getDocs(expiredQuery);

      for (const msgDoc of expiredSnap.docs) {
        await deleteDoc(doc(db, 'chats', chatDoc.id, 'messages', msgDoc.id));
        deletedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      deletedCount
    });
  } catch (error) {
    console.error("[Cron Cleanup] Error deleting expired messages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
