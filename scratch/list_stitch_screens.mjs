const apiKey = "AQ.Ab8RN6Jw65lIHVlvaSrbPfI3E69yvYj1VvsZkpBeRaeBlbohGw";
const serverUrl = "https://stitch.googleapis.com/mcp";
const projectId = "4223967153006821946"; // Pronoia — Frequencies

async function main() {
  console.log(`Listing screens for project ID ${projectId}...`);
  
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "list_screens",
      arguments: {
        projectId: projectId
      }
    }
  };

  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey
    },
    body: JSON.stringify(body)
  });

  const parsed = await response.json();
  const textContent = parsed.result?.content?.[0]?.text;
  
  if (textContent) {
    try {
      const data = JSON.parse(textContent);
      console.log("--- STITCH SCREENS ---");
      const screens = data.screens || data;
      if (Array.isArray(screens)) {
        for (const scr of screens) {
          console.log(`- Screen Title: ${scr.title}`);
          console.log(`  Name:         ${scr.name}`);
          console.log(`  Width/Height: ${scr.width} x ${scr.height}`);
          if (scr.htmlCode) {
            console.log(`  HTML Name:    ${scr.htmlCode.name}`);
            console.log(`  HTML URL:     ${scr.htmlCode.downloadUrl}`);
          }
          if (scr.screenshot) {
            console.log(`  Screenshot:   ${scr.screenshot.downloadUrl}`);
          }
          console.log("-----------------------");
        }
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.log("Text content is not JSON:", textContent);
    }
  } else {
    console.log("No text content in result:", JSON.stringify(parsed, null, 2));
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
});
