const { getStripeClient } = require("./_lib/stripe");
const { json, getCorsHeaders } = require("./_lib/http");

function getSessionIdFromPath(pathname = "") {
  const match = pathname.match(/\/checkout-session\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

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

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." }, corsHeaders);
  }

  const sessionId = getSessionIdFromPath(event.path);
  if (!sessionId) {
    return json(400, { error: "Missing session id." }, corsHeaders);
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return json(
      200,
      {
        id: session.id,
        paymentStatus: session.payment_status,
        status: session.status,
        amountTotal: session.amount_total,
        currency: session.currency,
      },
      corsHeaders,
    );
  } catch (error) {
    return json(
      500,
      {
        error:
          error && error.message
            ? error.message
            : "Unable to retrieve checkout session.",
      },
      corsHeaders,
    );
  }
};
