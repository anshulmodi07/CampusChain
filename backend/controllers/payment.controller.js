import Razorpay from "razorpay";
import ExpressError from "../utils/ExpressError.js";
import db from "../db/index.js";
import { recordDonation } from "../services/donation.service.js";
import {
  anchorDonation,
  generateDonationHash,
} from "../services/blockchain.service.js";


// Razorpay payment gateway logic only.
// This controller handles:
// - signature verification
// - recording donation in SQL (via donation service)
// - anchoring proof hash (via blockchain service)
// Blockchain specifics stay encapsulated in blockchain.service.js.

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
  // DB insert + anchoring happen only after signature verification succeeds.

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

  // Optional validation only for sanity.
  if (fundraiser_id == null || amount == null) {
    throw new ExpressError(400, "Missing fundraiser_id or amount.");
  }

  // WHY: Ensure we have the secret before attempting verification.
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new ExpressError(500, "Razorpay is not configured. Missing RAZORPAY_KEY_SECRET.");
  }

  // WHY: Re-compute expected HMAC and compare with provided signature.
  const { expected } = await verifyRazorpaySignature(
    { razorpay_order_id, razorpay_payment_id },
    razorpay_signature
  );

  if (expected !== razorpay_signature) {
    return res.status(401).json({
      success: false,
      verified: false,
      message: "Invalid Razorpay signature.",
    });
  }

  try {
    // WHY: Record donation in SQL first.
    const {
      donationId,
      donatedAt,
    } = await recordDonation({
      fundraiser_id,
      donor_address: req.user.wallet,
      amount,
      tx_hash: null,
      payment_method: "razorpay",
      payment_reference: razorpay_payment_id,
    });

    // WHY: Generate deterministic donation hash after INSERT.
    const donationHash = generateDonationHash({
      donationId,
      fundraiser_id,
      donor_address: req.user.wallet,
      amount,
      payment_method: "razorpay",
      payment_reference: razorpay_payment_id,
      donatedAt,
    });

    // WHY: Anchor proof; failure must not rollback DB.
    try {
      const { anchorTxHash } = await anchorDonation(donationHash);

      // WHY: Persist anchor_tx_hash only when anchoring succeeds.
      await db.promise().query(
        "UPDATE donations SET anchor_tx_hash = ? WHERE donation_id = ?",
        [anchorTxHash, donationId]
      );
    } catch (bcErr) {
      console.error("Blockchain anchoring failed (Razorpay):", bcErr);
    }

    return res.json({
      success: true,
      verified: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      donationId,
    });
  } catch (err) {
    throw new ExpressError(500, "Database error during Razorpay donation recording");
  }
};

export const createOrder = async (req, res) => {
  const { amount, fundraiser_id } = req.body;

  const parsedFundraiserId = Number(fundraiser_id);
  const parsedAmount = Number(amount);

  if (!Number.isInteger(parsedFundraiserId) || parsedFundraiserId <= 0) {
    throw new ExpressError(400, "Invalid fundraiser_id.");
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new ExpressError(400, "Invalid amount.");
  }

  const currency = (process.env.RAZORPAY_CURRENCY || "INR").toUpperCase();

  const paiseAmount = Math.round(parsedAmount * 100);

  if (paiseAmount <= 0) {
    throw new ExpressError(400, "Amount is too small to create an order.");
  }

  const razorpay = getRazorpayClient();

  const receipt = `campuschain_${parsedFundraiserId}_${Date.now()}`;

  const order = await razorpay.orders.create({
    amount: paiseAmount,
    currency,
    receipt,
    notes: {
      fundraiser_id: String(parsedFundraiserId),
    },
  });

  return res.status(201).json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: process.env.RAZORPAY_KEY_ID,
  });
};


