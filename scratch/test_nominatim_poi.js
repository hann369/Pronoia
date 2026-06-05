async function test() {
  const queries = [
    `Bioladen München`,
    `Bio München`,
    `Reformhaus München`,
    `Denns München`,
    `Alnatura München`
  ];
  
  for (const q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=3`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PronoiaApp/1.0 (contact@pronoia-app.de)'
        }
      });
      console.log(`Query: "${q}", Status:`, res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(`Results (${data.length}):`);
        data.forEach(item => {
          console.log(`  - Name: ${item.display_name}`);
          console.log(`    Lat: ${item.lat}, Lon: ${item.lon}`);
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
}

test();
