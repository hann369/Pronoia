const apiKey = "AQ.Ab8RN6Jw65lIHVlvaSrbPfI3E69yvYj1VvsZkpBeRaeBlbohGw";

const SCREENS = [
  {
    name: "profile.html",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzZkMzkwZTE3OThjMDQ5MTA5YzdmZjI0NjUxODAzZjRlEgsSBxDhlqitoRwYAZIBJAoKcHJvamVjdF9pZBIWQhQxNTg3NzgxNTg4MDI2NDUwNzkxNg&filename=&opi=96797242"
  },
  {
    name: "ecosystem.html",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzFlZWVhNTM5NTUwYzQ5MTdhYjA0Y2U1MDZhYTdhZGU3EgsSBxDhlqitoRwYAZIBJAoKcHJvamVjdF9pZBIWQhQxNTg3NzgxNTg4MDI2NDUwNzkxNg&filename=&opi=96797242"
  },
  {
    name: "connectors.html",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2FiZTBjYzQxMTAwNzQ3MmE5MjM1MTM5YzM5ODVhYjA1EgsSBxDhlqitoRwYAZIBJAoKcHJvamVjdF9pZBIWQhQxNTg3NzgxNTg4MDI2NDUwNzkxNg&filename=&opi=96797242"
  }
];

import fs from 'fs';
import path from 'path';

async function downloadScreen(screen) {
  console.log(`Downloading ${screen.name}...`);
  const response = await fetch(screen.url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey
    }
  });

  if (!response.ok) {
    console.error(`HTTP error for ${screen.name}! status: ${response.status}`);
    const text = await response.text();
    console.error(text);
    return;
  }

  const html = await response.text();
  const destDir = path.resolve("scratch");
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const destFile = path.join(destDir, screen.name);
  fs.writeFileSync(destFile, html, "utf-8");
  console.log(`Saved ${screen.name} (${fs.statSync(destFile).size} bytes)`);
}

async function main() {
  for (const screen of SCREENS) {
    await downloadScreen(screen);
  }
  console.log("All screens downloaded successfully!");
}

main().catch(err => {
  console.error("Fatal error:", err);
});
