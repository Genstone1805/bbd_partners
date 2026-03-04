const Stripe = require("stripe");
try {
  require("dotenv").config();
} catch {
  // dotenv is optional in serverless production.
}

let stripeClient = null;

function getStripePublishableKey() {
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!stripePublishableKey) {
    throw new Error("Missing STRIPE_PUBLISHABLE_KEY.");
  }
  return stripePublishableKey;
}

function getStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  if (!stripeClient) {
    stripeClient = Stripe(stripeSecretKey);
  }
  return stripeClient;
}

module.exports = {
  getStripeClient,
  getStripePublishableKey,
};
