const { getStripePublishableKey } = require("./_lib/stripe");
const { withCors, handleOptions } = require("./_lib/http");

module.exports = async function handler(req, res) {
  withCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const stripePublishableKey = getStripePublishableKey();
    return res.status(200).json({ stripePublishableKey });
  } catch (error) {
    return res.status(500).json({
      error: error && error.message ? error.message : "Stripe config error.",
    });
  }
};
