async function run() {
  const url = "https://pronoia-3g6y.vercel.app/api/agent-webhook";
  const payload = {
    source: "telegram_webapp",
    telegramUser: { id: 5996717439, username: "Hann_Studies" },
    event: "get_status"
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": "DEIN_WEBHOOK_SECRET_HIER"
      },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
