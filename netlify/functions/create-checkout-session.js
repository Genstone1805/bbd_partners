const { getStripeClient } = require("./_lib/stripe");
const {
  json,
  getCorsHeaders,
  parseJsonBody,
  sanitizeReturnBaseUrl,
  inferBaseUrl,
} = require("./_lib/http");

exports.handler = async function handler(event) {
  const origin = event.headers.origin;
  const corsHeaders = getCorsHeaders(origin);

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
  if (body === null) {
    return json(400, { error: "Invalid JSON body." }, corsHeaders);
  }

  const amount = Number(body.amount);
  const currency = String(body.currency || "aud").toLowerCase();
  if (!Number.isInteger(amount) || amount <= 0) {
    return json(400, { error: "Invalid amount." }, corsHeaders);
  }
  if (!/^[a-z]{3}$/.test(currency)) {
    return json(400, { error: "Invalid currency." }, corsHeaders);
  }

  try {
    const stripe = getStripeClient();
    const returnBaseUrl = sanitizeReturnBaseUrl(body.returnBaseUrl);
    const baseUrl = inferBaseUrl(event, returnBaseUrl);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      billing_address_collection: "required",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: "Garment Order Checkout",
            },
          },
        },
      ],
      success_url: `${baseUrl}/?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?stripe=cancelled`,
    });

    return json(200, { sessionId: session.id }, corsHeaders);
  } catch (error) {
    return json(
      500,
      {
        error:
          error && error.message
            ? error.message
            : "Unable to create checkout session.",
      },
      corsHeaders,
    );
  }
};
