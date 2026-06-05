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
  try {
    // 1. Get all users
    const usersUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users?key=${FIREBASE_API_KEY}&pageSize=100`;
    const usersRes = await fetch(usersUrl);
    const usersData = await usersRes.json();
    
    console.log("=== USERS ===");
    if (usersData.documents) {
      usersData.documents.forEach(doc => {
        const parts = doc.name.split("/");
        const docId = parts[parts.length - 1];
        const fields = parseFirestoreFields(doc.fields || {});
        console.log(`ID (Auth UID): ${docId}, profile:`, JSON.stringify(fields.profile));
      });
    } else {
      console.log("No users found or error:", JSON.stringify(usersData));
    }

    // 2. Get all vault items
    const vaultUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/vault_items?key=${FIREBASE_API_KEY}&pageSize=100`;
    const vaultRes = await fetch(vaultUrl);
    const vaultData = await vaultRes.json();
    
    console.log("=== VAULT ITEMS ===");
    if (vaultData.documents) {
      vaultData.documents.forEach(doc => {
        const parts = doc.name.split("/");
        const docId = parts[parts.length - 1];
        const fields = parseFirestoreFields(doc.fields || {});
        console.log(`ID: ${docId}, user_id: ${fields.user_id}, title: ${fields.title}, type: ${fields.type}, content: ${fields.content}`);
      });
    } else {
      console.log("No vault items found or error:", JSON.stringify(vaultData));
    }
  } catch (err) {
    console.error(err);
  }
}

run();
