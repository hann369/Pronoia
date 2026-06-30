const apiKey = "AQ.Ab8RN6Jw65lIHVlvaSrbPfI3E69yvYj1VvsZkpBeRaeBlbohGw";
const serverUrl = "https://stitch.googleapis.com/mcp";
const projectId = "15877815880264507916";

async function main() {
  console.log(`Getting project details for ID ${projectId}...`);
  
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "get_project",
      arguments: {
        project: `projects/${projectId}` // get_project usually expects full resource name projects/{id}
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
  console.log("Response:", JSON.stringify(parsed, null, 2));
}

main().catch(err => {
  console.error("Fatal error:", err);
});
