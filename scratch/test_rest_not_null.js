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
    const data = await res.json();
    if (res.status === 200) {
      console.log(`[${name}] SUCCESS! Found ${data.length} docs.`);
      data.forEach(d => {
        if (d.document) {
          const fields = d.document.fields;
          const username = fields?.profile?.mapValue?.fields?.username?.stringValue || 'Unnamed';
          const tgId = fields?.profile?.mapValue?.fields?.telegramId?.integerValue || fields?.profile?.mapValue?.fields?.telegramId?.stringValue || 'None';
          console.log(`  - Doc ID: ${d.document.name.split('/').pop()}, Username: ${username}, Telegram ID: ${tgId}`);
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
  // Query: profile.telegramId != null
  const notNullQuery = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "profile.telegramId" },
          op: "NOT_EQUAL",
          value: { nullValue: null }
        }
      }
    }
  };

  await test("Telegram ID != null", notNullQuery);
}

run();
