async function test() {
  const query = "Next.js 15 deliberate practice tutorial";
  const url = `https://html.duckduckgo.com/html/?q=site:youtube.com+${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("HTML length:", html.length);
    
    // Find all YouTube watch URLs
    const regex = /(?:youtube\.com\/watch\?v=|v%3D|v=)([a-zA-Z0-9_-]{11})/g;
    const matches = [...html.matchAll(regex)];
    const uniqueMatches = [...new Set(matches.map(m => m[1]))];
    console.log("Found matches:", uniqueMatches.slice(0, 10));
  } catch (err) {
    console.error(err);
  }
}

test();
