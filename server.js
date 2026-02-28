const path = require("path");
const express = require("express");
const Stripe = require("stripe");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT) || 4242;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

if (!stripeSecretKey) {
  console.error("Missing STRIPE_SECRET_KEY in environment.");
  process.exit(1);
}
if (!stripePublishableKey) {
  console.error("Missing STRIPE_PUBLISHABLE_KEY in environment.");
  process.exit(1);
}

const stripe = Stripe(stripeSecretKey);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/api/config", (req, res) => {
  return res.json({
    stripePublishableKey,
  });
});

app.post("/api/create-payment-intent", async (req, res) => {
  const amount = Number(req.body?.amount);
  const currency = String(req.body?.currency || "aud").toLowerCase();

  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount." });
  }

  if (!/^[a-z]{3}$/.test(currency)) {
    return res.status(400).json({ error: "Invalid currency." });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "Unable to create payment intent.";
    return res.status(500).json({ error: message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Stripe demo server running on http://localhost:${port}`);
});
