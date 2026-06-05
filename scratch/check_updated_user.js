const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\hanne\\.gemini\\antigravity\\brain\\6833fb5f-e4bb-43fc-923d-555e94049308\\.system_generated\\steps\\919\\output.txt', 'utf8');
const data = JSON.parse(content);
console.log("isPaid:", JSON.stringify(data.fields.isPaid));
console.log("role:", JSON.stringify(data.fields.role));
console.log("subscriptionTier:", JSON.stringify(data.fields.profile?.mapValue?.fields?.subscriptionTier));
