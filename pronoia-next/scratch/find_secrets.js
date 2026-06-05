const fs = require('fs');
const path = require('path');

function searchDir(dir, depth = 0) {
  if (depth > 4) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === '.next') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchDir(fullPath, depth + 1);
      } else if (file.endsWith('.json') || file.endsWith('.js') || file.startsWith('.env')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('private_key') || content.includes('client_email') || content.includes('service_account')) {
          console.log(`FOUND KEY FILE: ${fullPath}`);
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

console.log("Searching for secrets in workspaces...");
searchDir('c:\\Users\\hanne\\Desktop\\pronoia');
searchDir('c:\\Users\\hanne\\Desktop\\Pronoia Bot');
console.log("Done.");
