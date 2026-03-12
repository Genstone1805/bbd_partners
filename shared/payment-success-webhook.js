const PAYMENT_SUCCESS_WEBHOOK_URL =
  process.env.PAYMENT_SUCCESS_WEBHOOK_URL ||
  "https://hooks.zapier.com/hooks/catch/26757282/uxqv84m/";

async function forwardPaymentSuccessWebhook(payload) {
  const response = await fetch(PAYMENT_SUCCESS_WEBHOOK_URL, {
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
