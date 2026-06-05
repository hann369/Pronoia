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

async function test(name, queryBody) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryBody)
    });
    console.log(`[${name}] Status:`, res.status);
    const data = await res.status === 200 ? await res.json() : await res.text();
    console.log(`[${name}] Output:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[${name}] Error:`, err);
  }
}

async function run() {
  // Query 1: Filter by profile.username
  const queryUsername = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "profile.username" },
          op: "EQUAL",
          value: { stringValue: "Hann369" }
        }
      }
    }
  };

  // Query 2: Filter by profile.telegramId
  const queryTelegram = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "profile.telegramId" },
          op: "EQUAL",
          value: { integerValue: "5996717439" }
        }
      }
    }
  };

  await test("Query by Username", queryUsername);
  await test("Query by Telegram ID", queryTelegram);
}

run();
