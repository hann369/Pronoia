import pkgEnv from '@next/env';
import path from 'path';

process.env.NODE_ENV = 'production';
const projectDir = path.resolve(process.cwd());
pkgEnv.loadEnvConfig(projectDir);

async function testMistralDirect() {
  const mistralApiKey = process.env.MISTRAL_API_KEY;
  if (!mistralApiKey) {
    console.error("MISTRAL_API_KEY is not defined in the environment.");
    return;
  }

  const SYSTEM_PROMPT = (
    "Du bist Hermes, der KI-Begleiter im Pronoia Life OS. Antworte direkt, " +
    "präzise, wissenschaftlich fundiert und auf Deutsch. Du hilfst bei Fokus, " +
    "Schlaf, Supplementation und Tagesstruktur. Halte dich kurz."
  );

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: "Hallo Hermes, wie geht es dir?" }
  ];

  try {
    console.log("Calling Mistral API at https://api.mistral.ai/v1/chat/completions...");
    console.log("API Key preview:", mistralApiKey.substring(0, 8) + "...");
    
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mistralApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    console.log("Response Status:", res.status);
    console.log("Response OK:", res.ok);

    const text = await res.text();
    console.log("Response Body:", text);

  } catch (err) {
    console.error("Fetch request failed:", err);
  }
}

testMistralDirect();
