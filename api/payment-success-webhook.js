const { getStripeClient } = require("./_lib/stripe");
const { withCors, handleOptions } = require("./_lib/http");
const { forwardPaymentSuccessWebhook } = require("../shared/payment-success-webhook");

async function buildWebhookPayload(body) {
  const stripe = getStripeClient();
  const paymentInformation =
    body && typeof body.paymentInformation === "object" && body.paymentInformation
      ? { ...body.paymentInformation }
      : {};

  if (paymentInformation.sessionId) {
    paymentInformation.stripeCheckoutSession = await stripe.checkout.sessions.retrieve(
      paymentInformation.sessionId,
    );
  }

  if (paymentInformation.paymentIntentId) {
    paymentInformation.stripePaymentIntent = await stripe.paymentIntents.retrieve(
      paymentInformation.paymentIntentId,
    );
  }

  return {
    submittedAt:
      typeof body?.submittedAt === "string" && body.submittedAt
        ? body.submittedAt
        : new Date().toISOString(),
    pageUrl: typeof body?.pageUrl === "string" ? body.pageUrl : "",
    checkoutTotal: Number(body?.checkoutTotal) || 0,
    formData: body?.formData ?? null,
    paymentInformation,
  };
}

module.exports = async function handler(req, res) {
  withCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Invalid payload." });
  }

  try {
    const payload = await buildWebhookPayload(req.body);
    await forwardPaymentSuccessWebhook(payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "Unable to send payment success webhook.";
    return res.status(500).json({ error: message });
  }
};
