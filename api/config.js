const { stripePublishableKey } = require("./_lib/stripe");
const { withCors, handleOptions } = require("./_lib/http");

module.exports = async function handler(req, res) {
  withCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  return res.status(200).json({ stripePublishableKey });
};
