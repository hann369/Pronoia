const apiKey = "AQ.Ab8RN6Jw65lIHVlvaSrbPfI3E69yvYj1VvsZkpBeRaeBlbohGw";
const serverUrl = "https://stitch.googleapis.com/mcp";

async function main() {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {}
  };

  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  const parsed = JSON.parse(text);
  
  if (parsed.result && parsed.result.tools) {
    console.log("--- STITCH TOOLS ---");
    for (const tool of parsed.result.tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }
  } else {
    console.log("No tools found in result or error:", parsed.error);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
});
