const Stripe = require("stripe");

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY.");
}
if (!stripePublishableKey) {
  throw new Error("Missing STRIPE_PUBLISHABLE_KEY.");
}

const stripe = Stripe(stripeSecretKey);

module.exports = {
  stripe,
  stripePublishableKey,
};
