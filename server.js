const path = require("path");
const express = require("express");
const Stripe = require("stripe");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT) || 4242;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const appBaseUrl = process.env.APP_BASE_URL;

if (!stripeSecretKey) {
  console.error("Missing STRIPE_SECRET_KEY in environment.");
  process.exit(1);
}
if (!stripePublishableKey) {
  console.error("Missing STRIPE_PUBLISHABLE_KEY in environment.");
  process.exit(1);
}

const stripe = Stripe(stripeSecretKey);

function isAllowedDevOrigin(origin) {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function sanitizeReturnBaseUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(String(value));
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    if (host !== "localhost" && host !== "127.0.0.1") return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function getBaseUrl(req, returnBaseUrl) {
  if (returnBaseUrl) return returnBaseUrl.replace(/\/+$/, "");
  if (appBaseUrl) return appBaseUrl.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

app.use(express.json());
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && isAllowedDevOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

app.use(express.static(path.join(__dirname)));

app.get("/api/config", (req, res) => {
  return res.json({ stripePublishableKey });
});

app.post("/api/create-checkout-session", async (req, res) => {
  const amount = Number(req.body?.amount);
  const currency = String(req.body?.currency || "aud").toLowerCase();

  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount." });
  }
  if (!/^[a-z]{3}$/.test(currency)) {
    return res.status(400).json({ error: "Invalid currency." });
  }

  try {
    const returnBaseUrl = sanitizeReturnBaseUrl(req.body?.returnBaseUrl);
    const baseUrl = getBaseUrl(req, returnBaseUrl);
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

    return res.json({ sessionId: session.id });
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "Unable to create checkout session.";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/checkout-session/:id", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id);
    return res.json({
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
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Stripe app running on http://localhost:${port}`);
});
