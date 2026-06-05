// scratch/test-rest-query.js
const fs = require('fs');
const path = require('path');

// Parse .env.local keys
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const config = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*NEXT_PUBLIC_FIREBASE_([A-Z_]+)\s*=\s*(.+?)\s*$/);
  if (match) {
    const key = match[1].toLowerCase().replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    config[key] = match[2].trim();
  }
});

const telegramId = 5996717439;

async function testREST() {
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery?key=${config.apiKey}`;
  const payload = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "profile.telegramId" },
          op: "IN",
          value: {
            arrayValue: {
              values: [
                { integerValue: telegramId },
                { stringValue: String(telegramId) }
              ]
            }
          }
        }
      }
    }
  };

  console.log("Sending query to REST URL:", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("REST response status:", res.status);
    console.log("REST response body:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("REST request failed:", err);
  }
}

testREST();
