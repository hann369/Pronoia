import pkgEnv from '@next/env';
import path from 'path';

process.env.NODE_ENV = 'production';
const projectDir = path.resolve(process.cwd());
pkgEnv.loadEnvConfig(projectDir);

const { adminDb } = await import('../lib/firebaseAdmin.js');

async function debugUserCtx() {
  if (!adminDb) {
    console.error("Firestore Admin SDK could not be initialized.");
    return;
  }

  const userUid = 'B8RE7nVZpiTtc1QzwUfyufc7mG22';
  try {
    const userDoc = await adminDb.collection("users").doc(userUid).get();
    if (!userDoc.exists) {
      console.log("User doc not found.");
      return;
    }

    const userData = userDoc.data();
    console.log("User Calendar:", JSON.stringify(userData.calendar, null, 2));

    const sugSnap = await adminDb.collection("users").doc(userUid).collection("suggestions").get();
    console.log("Suggestions count:", sugSnap.size);
    sugSnap.docs.forEach(d => {
      console.log(`- Suggestion ${d.id}:`, JSON.stringify(d.data(), null, 2));
    });

  } catch (err) {
    console.error("Error fetching user debug context:", err);
  }
}

debugUserCtx();
