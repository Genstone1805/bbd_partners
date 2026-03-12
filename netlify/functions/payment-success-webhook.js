const { getStripeClient } = require("./_lib/stripe");
const { json, getCorsHeaders, parseJsonBody } = require("./_lib/http");
const { forwardPaymentSuccessWebhook } = require("../../shared/payment-success-webhook");

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

module.exports = async function handler(event) {
  const corsHeaders = getCorsHeaders(event.headers.origin);

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." }, corsHeaders);
  }

  const body = parseJsonBody(event);
  if (!body || typeof body !== "object") {
    return json(400, { error: "Invalid payload." }, corsHeaders);
  }

  try {
    const payload = await buildWebhookPayload(body);
    await forwardPaymentSuccessWebhook(payload);
    return json(200, { ok: true }, corsHeaders);
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "Unable to send payment success webhook.";
    return json(500, { error: message }, corsHeaders);
  }
};
