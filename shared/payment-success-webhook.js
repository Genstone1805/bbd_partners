try {
  require("dotenv").config();
} catch {
  // dotenv is optional when the platform injects environment variables directly.
}

function getPaymentSuccessWebhookUrl() {
  const webhookUrl = process.env.WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("Missing WEBHOOK_URL in environment.");
  }

  return webhookUrl;
}

async function forwardPaymentSuccessWebhook(payload) {
  const response = await fetch(getPaymentSuccessWebhookUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  if (!response.ok) {
    const suffix = responseText ? ` ${responseText}` : "";
    throw new Error(`Webhook request failed with ${response.status}.${suffix}`.trim());
  }

  return {
    status: response.status,
    body: responseText,
  };
}

module.exports = {
  forwardPaymentSuccessWebhook,
};
