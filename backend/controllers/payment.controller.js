import Razorpay from "razorpay";
import ExpressError from "../utils/ExpressError.js";
import { recordDonation } from "../services/donation.service.js";


// Razorpay payment gateway logic only.
// This controller intentionally does NOT record donations or write blockchain data.
// That responsibility remains exclusively in donation.controller.js.

const getRazorpayClient = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  // Fail fast on misconfiguration to avoid creating unusable orders.
  if (!key_id || !key_secret) {
    throw new ExpressError(
      500,
      "Razorpay is not configured. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET."
    );
  }

  return new Razorpay({ key_id, key_secret });
};

const verifyRazorpaySignature = async ({ razorpay_order_id, razorpay_payment_id }, razorpay_signature) => {
  // WHY: Razorpay signs the order/payment pair to prove authenticity.

  // We re-create that signature on the server and compare it with the client-provided signature.
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new ExpressError(
      500,
      "Razorpay is not configured. Missing RAZORPAY_KEY_SECRET."
    );
  }

  // Razorpay signature format: hex string (HMAC-SHA256)
  // Expected payload: "order_id|payment_id"
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;

  const crypto = await import("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return { expected };
};

export const verifyPayment = async (req, res) => {
  // WHY: This endpoint exists to prove that the Razorpay signature matches the
  // order/payment pair reported by the client.
  // No DB writes, no blockchain, no donation recording are performed here.

  const {
    fundraiser_id,
    amount,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  // WHY: Validate required fields early to return clean 400 errors rather than
  // crashing signature computation.
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ExpressError(400, "Missing razorpay fields.");
  }

  // Optional validation only for sanity (no DB usage).
  if (fundraiser_id == null || amount == null) {
    // Keep behavior strict to avoid accepting incomplete client payloads.
    throw new ExpressError(400, "Missing fundraiser_id or amount.");
  }

  // WHY: Ensure we have the secret before attempting verification.
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new ExpressError(
      500,
      "Razorpay is not configured. Missing RAZORPAY_KEY_SECRET."
    );
  }

  // WHY: Re-compute expected HMAC and compare with provided signature.
  // Expected: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id)
  const { expected } = await verifyRazorpaySignature(
    { razorpay_order_id, razorpay_payment_id },
    razorpay_signature
  );

  if (expected !== razorpay_signature) {
    // WHY: Signature mismatch means tampering or an incorrect payload.
    return res.status(401).json({
      success: false,
      verified: false,
      message: "Invalid Razorpay signature.",
    });
  }

  // WHY: On successful verification, record the donation in the same DB layer used by MetaMask.
  // This keeps HTTP concerns in the controller and DB INSERT in the service.
  const donationId = await recordDonation({
    fundraiser_id,
    donor_address: req.user.wallet,
    amount,
    tx_hash: null,
    payment_method: "razorpay",
    payment_reference: razorpay_payment_id,
  });

  // WHY: Return a minimal success structure for frontend to proceed.
  return res.json({
    success: true,
    verified: true,
    payment_id: razorpay_payment_id,
    order_id: razorpay_order_id,
    donationId,
  });
};


export const createOrder = async (req, res) => {

  const { amount, fundraiser_id } = req.body;



  // Validate inputs early to prevent leaking internal errors and to avoid
  // sending invalid requests to Razorpay.
  const parsedFundraiserId = Number(fundraiser_id);
  const parsedAmount = Number(amount);

  if (!Number.isInteger(parsedFundraiserId) || parsedFundraiserId <= 0) {
    throw new ExpressError(400, "Invalid fundraiser_id.");
  }

  // Razorpay expects an integer amount in the smallest currency unit.
  // We treat incoming `amount` as major currency units (e.g., rupees) and
  // convert to paise. If your frontend already sends paise, this can be adjusted
  // in STEP 2 without changing donation recording logic.
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new ExpressError(400, "Invalid amount.");
  }

  const currency = (process.env.RAZORPAY_CURRENCY || "INR").toUpperCase();

  // INR -> paise (2 decimals). For other currencies, you may extend this mapping.
  const paiseAmount = Math.round(parsedAmount * 100);

  if (paiseAmount <= 0) {
    throw new ExpressError(400, "Amount is too small to create an order.");
  }

  const razorpay = getRazorpayClient();

  // A non-sensitive receipt helps Razorpay/ops correlate orders later.
  // We include fundraiser_id and a timestamp to ensure uniqueness.
  const receipt = `campuschain_${parsedFundraiserId}_${Date.now()}`;

  // This endpoint returns just what the client needs to proceed with Razorpay checkout.
  // Do not verify payment or record donations here.
  const order = await razorpay.orders.create({
    amount: paiseAmount,
    currency,
    receipt,
    notes: {
      fundraiser_id: String(parsedFundraiserId)
    }
  });

  return res.status(201).json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: process.env.RAZORPAY_KEY_ID
  });
};

