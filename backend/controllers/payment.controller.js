import Razorpay from "razorpay";
import ExpressError from "../utils/ExpressError.js";

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

