const fs = require('fs');
const path = require('path');

// Parse .env.local
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

// Helper to parse Firestore fields
function parseFirestoreFields(fields) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if ('stringValue' in value) result[key] = value.stringValue;
    else if ('integerValue' in value) result[key] = parseInt(value.integerValue);
    else if ('doubleValue' in value) result[key] = parseFloat(value.doubleValue);
    else if ('booleanValue' in value) result[key] = value.booleanValue;
    else if ('mapValue' in value) result[key] = parseFirestoreFields(value.mapValue.fields || {});
    else if ('arrayValue' in value) {
      result[key] = (value.arrayValue.values || []).map(v => {
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return parseInt(v.integerValue);
        if ('mapValue' in v) return parseFirestoreFields(v.mapValue.fields || {});
        return null;
      });
    }
  }
  return result;
}

async function run() {
  const telegramId = "5996717439";
  const idStr = String(telegramId);

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
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
                { integerValue: idStr },
                { stringValue: idStr }
              ]
            }
          }
        }
      }
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("REST runQuery Status:", res.status);
    console.log("REST runQuery Output:", JSON.stringify(data, null, 2));

    if (Array.isArray(data) && data.length > 0 && data[0].document) {
      const doc = data[0].document;
      const parts = doc.name.split("/");
      const docId = parts[parts.length - 1];
      const parsed = parseFirestoreFields(doc.fields || {});
      console.log(`Resolved Auth UID: ${docId}`);
      console.log(`User Profile Data:`, parsed);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
