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

const FIREBASE_PROJECT_ID = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function test(name, collectionId) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId }]
    }
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryBody)
    });
    console.log(`[${name}] Status:`, res.status);
    const data = await res.json();
    if (res.status === 200) {
      console.log(`[${name}] SUCCESS! Found ${data.length} docs.`);
      data.forEach(d => {
        if (d.document) {
          console.log(`  - Doc: ${d.document.name}`);
          console.log(`    Data:`, JSON.stringify(d.document.fields || {}));
        }
      });
    } else {
      console.log(`[${name}] FAILED:`, JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(`[${name}] Error:`, err);
  }
}

async function run() {
  await test("Chats", "chats");
}

run();
