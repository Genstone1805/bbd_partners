const { getStripePublishableKey } = require("./_lib/stripe");
const { json, getCorsHeaders } = require("./_lib/http");

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

  try {
    const stripePublishableKey = getStripePublishableKey();
    return json(200, { stripePublishableKey }, corsHeaders);
  } catch (error) {
    return json(
      500,
      {
        error: error && error.message ? error.message : "Stripe config error.",
      },
      corsHeaders,
    );
  }
};
