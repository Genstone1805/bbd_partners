const { getStripeClient } = require("./_lib/stripe");
const {
  withCors,
  handleOptions,
  sanitizeReturnBaseUrl,
  inferBaseUrl,
} = require("./_lib/http");

module.exports = async function handler(req, res) {
  withCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const amount = Number(req.body?.amount);
  const currency = String(req.body?.currency || "aud").toLowerCase();
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount." });
  }
  if (!/^[a-z]{3}$/.test(currency)) {
    return res.status(400).json({ error: "Invalid currency." });
  }

  try {
    const stripe = getStripeClient();
    const returnBaseUrl = sanitizeReturnBaseUrl(req.body?.returnBaseUrl);
    const baseUrl = inferBaseUrl(req, returnBaseUrl);
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

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "Unable to create checkout session.";
    return res.status(500).json({ error: message });
  }
};
