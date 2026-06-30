const apiKey = "AQ.Ab8RN6Jw65lIHVlvaSrbPfI3E69yvYj1VvsZkpBeRaeBlbohGw";
const serverUrl = "https://stitch.googleapis.com/mcp";
const projectId = "15877815880264507916"; // Pronoia — NorthStar Upgrade

const SCREENS = [
  {
    key: "profile",
    title: "Pronoia — Profile Tab",
    prompt: `Create a settings/profile screen styled like Apple iOS Settings—clean, structured, logical, and minimalist. It should match the Pronoia design system (dark background #060509, soft text #ECE8F2, cobalt accent #1A6AFF, and glass panels).
Sections:
1. User Profile: Profile image placeholder, username, bio, and role.
2. Account Security: Password change, E2E Encryption key management (Buttons for: Export Private Key, Import Private Key, Reset E2E Keys).
3. Subscription: Stripe subscription overview (Pro Tier, €9.99/mo, Active status. Options: Pause billing, Skip next delivery, Cancel subscription).
4. Data & Privacy (GDPR): Buttons to Export personal data, Delete account.`
  },
  {
    key: "ecosystem",
    title: "Pronoia — Ecosystem (Subscriptions & Shop)",
    prompt: `Create a split-screen dashboard for the Pronoia Ecosystem. Theme: Dark premium, glassmorphism, clean typography.
Left Side (Subscriptions & Stacks):
- Display active subscriptions (e.g., PX-V1 Nootropic Matrix replenishment tracker showing days left: "12 days left in current stack").
- Options to: "Delay next delivery by 7 days", "Reschedule Refill", or "Adjust dosage".
Right Side (Pronoia Shop):
- A modern, clean, and highly aesthetic boutique e-commerce shop interface.
- Display premium products with high visual quality: PX-V1 Nootropic Matrix bottle (€34/charge), Organic Cotton/Linen T-shirt (€29), Aleppo Soap post-workout environment modifier (€15).
- Minimalist card designs with "Explore batch" and "Integrated checkout" actions. Give a lot of creative freedom to the shop layout while matching the core theme.`
  },
  {
    key: "connectors",
    title: "Pronoia — Connectors (Integrations)",
    prompt: `Create a modular constructor screen for managing API Connectors (inspired by Notion but cleaner). Theme: Dark premium, glass panels, clean monospaced headers.
Layout:
- A grid of connector cards (WHOOP, Notion, PayPal, Zapier, and a placeholder for new integrations "+ Add Connector").
- Each card displays the connector logo, name, description, and status badge (e.g., green glowing "Active" or amber "Disconnected").
- Underneath each card, show an expandable detailed accordion panel containing toggles for specific permission scopes (e.g. WHOOP: "Read Sleep Metrics", "Read HRV Trends", "Sync daily recovery score").
- Clean, structured, stable feel like a modular dashboard.`
  }
];

async function generateScreen(screen) {
  console.log(`\n==================================================`);
  console.log(`Starting generation for: ${screen.title}...`);
  console.log(`==================================================`);

  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: "generate_screen_from_text",
      arguments: {
        projectId: projectId,
        prompt: `Title: ${screen.title}\n\nDescription:\n${screen.prompt}`,
        deviceType: "DESKTOP",
        modelId: "GEMINI_3_1_PRO"
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
  
  if (parsed.result && !parsed.result.isError) {
    const textContent = parsed.result.content?.[0]?.text;
    console.log(`Successfully completed call for ${screen.title}.`);
    console.log(`Result text:`);
    console.log(textContent);
  } else {
    console.error(`Error generating ${screen.title}:`, JSON.stringify(parsed, null, 2));
  }
}

async function main() {
  for (const screen of SCREENS) {
    try {
      await generateScreen(screen);
    } catch (err) {
      console.error(`Failed during generation of ${screen.title}:`, err);
    }
  }
  console.log("\nAll generation requests finished!");
}

main().catch(err => {
  console.error("Fatal error:", err);
});
