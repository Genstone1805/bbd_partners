const { getStripeClient } = require("../_lib/stripe");
const { withCors, handleOptions } = require("../_lib/http");

module.exports = async function handler(req, res) {
  withCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const sessionId = req.query?.id;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Missing session id." });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return res.status(200).json({
      id: session.id,
      paymentStatus: session.payment_status,
      status: session.status,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "Unable to retrieve checkout session.";
    return res.status(500).json({ error: message });
  }
};
