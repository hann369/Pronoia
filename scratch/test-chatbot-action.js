// scratch/test-chatbot-action.js
async function run() {
  const url = "https://pronoia-3g6y.vercel.app/api/mistral";
  const payload = {
    message: "Logge meine HRV auf 88 ms",
    profile: {
      metrics: {
        hrv: 72,
        sleep: 84
      }
    },
    history: [],
    telegramUser: {
      id: 5996717439
    }
  };

  console.log("Sending chat message to:", url);
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Chat Response status:", res.status);
    console.log("Chat Response body:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Chat request failed:", err);
  }
}

run();
