import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";
import { recordDonation } from "../services/donation.service.js";


// -------- DONATE --------
export const donate = async (req, res) => {
  let { fundraiser_id, amount, tx_hash } = req.body;
  const donorWallet = req.user.wallet;

  fundraiser_id = parseInt(fundraiser_id);
  amount = parseFloat(amount);

  // WHY: HTTP controller validates request shape before calling DB layer.
  if (isNaN(fundraiser_id) || isNaN(amount)) {
    throw new ExpressError(400, "Invalid donation data");
  }

  try {
    // WHY: DB insertion is delegated to a reusable service.
    // Keep behavior IDENTICAL: tx_hash falls back to Date.now().
    const donationId = await recordDonation({
      fundraiser_id,
      donor_address: donorWallet,
      amount,
      tx_hash,
      payment_method: null,
      payment_reference: null,
    });

    res.json({
      message: "Donation successful",
      donationId,
    });

  } catch (err) {
    throw new ExpressError(500, "Database error during donation");
  }
};


// -------- MY DONATIONS --------
export const myDonations = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT * FROM donations WHERE donor_address = ?",
      [req.user.wallet]
    );

    res.json(rows);

  } catch (err) {
    throw new ExpressError(500, "Database error fetching donations");
  }
};
