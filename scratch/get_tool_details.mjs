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

  const parsed = await response.json();
  const getProjectTool = parsed.result?.tools?.find(t => t.name === "get_project");
  console.log("get_project inputSchema:", JSON.stringify(getProjectTool?.inputSchema, null, 2));
}

main().catch(err => {
  console.error("Fatal error:", err);
});
