async function test() {
  const url = `https://firestore.googleapis.com/v1/projects/pronoia-data/databases/(default)/documents:runQuery`;
  const queryBody = {
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

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryBody)
    });
    console.log(`Status:`, res.status);
    const data = await res.json();
    console.log(`Response:`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
