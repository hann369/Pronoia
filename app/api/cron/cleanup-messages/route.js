// app/api/cron/cleanup-messages/route.js
//
// Deletes expired chat messages (expiresAt <= now). Uses a single Admin SDK
// collectionGroup query across ALL chats' `messages` subcollections plus batched
// deletes — O(expired) instead of the old O(all chats) client-side scan, so it
// no longer times out on large datasets.
//
// LONG-TERM: prefer a native Firestore TTL policy on the `messages` collection
// group's `expiresAt` field (Firestore deletes documents automatically, free,
// no compute). This route then becomes a redundant safety net. See README/docs.

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const BATCH = 400; // Firestore batch write limit is 500; stay under it.

export async function GET(request) {
  if (!adminDb) {
    return NextResponse.json({ error: 'Server Firestore (Admin SDK) is not configured' }, { status: 503 });
  }

  // Cron auth (Vercel Cron sends the configured Authorization header).
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();
  let deletedCount = 0;

  try {
    // Loop in pages so a single invocation stays well within serverless limits.
    // Each pass deletes up to BATCH expired messages; repeat until none remain
    // or we hit a safety cap.
    for (let pass = 0; pass < 25; pass++) {
      const snap = await adminDb
        .collectionGroup('messages')
        .where('expiresAt', '<=', now)
        .limit(BATCH)
        .get();

      if (snap.empty) break;

      const batch = adminDb.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deletedCount += snap.size;

      if (snap.size < BATCH) break; // last page
    }

    return NextResponse.json({ success: true, timestamp: now, deletedCount });
  } catch (error) {
    console.error('[Cron Cleanup] Error deleting expired messages:', error);
    return NextResponse.json({ error: error.message, deletedCount }, { status: 500 });
  }
}
