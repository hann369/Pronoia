// scratch/test-rest-write.js
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

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    } else {
      return { doubleValue: val };
    }
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const k in val) {
      fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function buildNestedFields(flatObj) {
  const nested = {};
  for (const key in flatObj) {
    const parts = key.split(".");
    let current = nested;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = flatObj[key];
  }
  return nested;
}

async function updateDocREST(docId, flatObj) {
  const nestedObj = buildNestedFields(flatObj);
  const fields = {};
  for (const k in nestedObj) {
    fields[k] = toFirestoreValue(nestedObj[k]);
  }

  const queryParams = new URLSearchParams();
  queryParams.append("key", config.apiKey);
  for (const key in flatObj) {
    queryParams.append("updateMask.fieldPaths", key);
  }

  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/users/${docId}?${queryParams.toString()}`;
  
  console.log("Sending PATCH request to:", url);
  console.log("Payload fields:", JSON.stringify(fields, null, 2));

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PATCH request failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  const docId = "B8RE7nVZpiTtc1QzwUfyufc7mG22";
  const newHrv = Math.floor(Math.random() * 40) + 60; // Random HRV between 60 and 100
  const newSleep = Math.floor(Math.random() * 20) + 80; // Random Sleep between 80 and 100

  console.log(`Updating document ${docId} with HRV: ${newHrv}, Sleep: ${newSleep}...`);
  try {
    const result = await updateDocREST(docId, {
      "profile.metrics.hrv": newHrv,
      "profile.metrics.sleep": newSleep
    });
    console.log("Update succeeded! Result details:");
    console.log("Updated HRV:", result.fields?.profile?.mapValue?.fields?.metrics?.mapValue?.fields?.hrv?.integerValue);
    console.log("Updated Sleep:", result.fields?.profile?.mapValue?.fields?.metrics?.mapValue?.fields?.sleep?.integerValue);
  } catch (err) {
    console.error("Update failed:", err);
  }
}

run();
