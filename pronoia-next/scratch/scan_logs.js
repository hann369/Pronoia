const fs = require('fs');
const path = require('path');

const ids = new Set();
const usernames = new Set();

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Scan for Telegram IDs (typically 9-10 digit numbers)
    const tgMatches = content.match(/\b\d{9,10}\b/g);
    if (tgMatches) {
      tgMatches.forEach(id => ids.add(id));
    }
    
    // Scan for usernames or temp UIDs in code/JSON
    const usernameMatches = content.match(/["']username["']\s*:\s*["']([^"']+)["']/g);
    if (usernameMatches) {
      usernameMatches.forEach(m => {
        const u = m.split(':')[1].replace(/["'\s]/g, '');
        usernames.add(u);
      });
    }
  } catch (e) {
    // Ignore errors
  }
}

function traverse(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === '.next') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else {
        scanFile(fullPath);
      }
    }
  } catch (e) {
    // Ignore
  }
}

console.log("Scanning workspaces for cached Telegram IDs and usernames...");
traverse('c:\\Users\\hanne\\Desktop\\pronoia');
traverse('c:\\Users\\hanne\\Desktop\\Pronoia Bot');

console.log("Cached Telegram IDs found in local code/scratch files:", Array.from(ids));
console.log("Cached usernames found in local code/scratch files:", Array.from(usernames));
