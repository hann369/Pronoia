// Using native global fetch

async function check() {
  const url = 'https://pronoia-3g6y.vercel.app/life-os';
  console.log(`Fetching HTML from ${url}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch page: ${res.status} ${res.statusText}`);
      return;
    }
    const html = await res.text();
    console.log("HTML length:", html.length);

    // Search for next.js script chunks
    const chunkRegex = /\/_next\/static\/chunks\/(pages\/life-os|[\w\d.-]+)\.js/g;
    const chunks = [];
    let match;
    while ((match = chunkRegex.exec(html)) !== null) {
      chunks.push(match[0]);
    }
    
    // Also check build id
    const buildIdMatch = html.match(/"buildId":"([\w\d.-]+)"/);
    if (buildIdMatch) {
      console.log("Next.js Build ID:", buildIdMatch[1]);
    }

    console.log(`Found ${chunks.length} JavaScript chunks in HTML:`, chunks);

    // Fetch and check each chunk for "Telegram ID"
    let found = false;
    for (const chunk of chunks) {
      const chunkUrl = `https://pronoia-3g6y.vercel.app${chunk}`;
      console.log(`Checking chunk: ${chunkUrl}`);
      const chunkRes = await fetch(chunkUrl);
      if (chunkRes.ok) {
        const text = await chunkRes.text();
        if (text.includes("Telegram ID") || text.includes("Telegram-Konto erfolgreich")) {
          console.log(`🔥 SUCCESS: Found "Telegram ID" in chunk: ${chunk}`);
          found = true;
        }
      }
    }
    
    if (!found) {
      console.log("❌ FAILURE: Could not find 'Telegram ID' in any of the deployed static JS chunks. The website is definitely running an OLD build!");
    } else {
      console.log("✅ CONFIRMED: The 'Telegram ID' string exists in the deployed build. The issue is likely local browser caching or user profile context.");
    }

  } catch (err) {
    console.error("Error during check:", err);
  }
}

check();
