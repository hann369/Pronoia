const apiKey = "AQ.Ab8RN6Jw65lIHVlvaSrbPfI3E69yvYj1VvsZkpBeRaeBlbohGw";
const serverUrl = "https://stitch.googleapis.com/mcp";

async function main() {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "list_projects",
      arguments: {}
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
      console.log("--- STITCH PROJECTS ---");
      const projects = data.projects || data; // handle different envelope levels
      if (Array.isArray(projects)) {
        for (const proj of projects) {
          console.log(`- Title: ${proj.title}`);
          console.log(`  Name:  ${proj.name}`);
          console.log(`  Type:  ${proj.projectType}`);
          console.log(`  Update: ${proj.updateTime}`);
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
