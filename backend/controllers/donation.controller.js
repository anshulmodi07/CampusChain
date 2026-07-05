import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";
import { recordDonation } from "../services/donation.service.js";
import { anchorDonation, generateDonationHash } from "../services/blockchain.service.js";

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

  // WHY: Orchestrate DB insert first, then attempt anchoring.
  // If anchoring fails, keep SQL record and return success (per requirements).
  try {
    if (tx_hash) {
      const [existing] = await db.promise().query(
        "SELECT donation_id FROM donations WHERE tx_hash = ?",
        [tx_hash]
      );
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: "This transaction hash has already been recorded.",
        });
      }
    }

    const { donationId, donatedAt } = await recordDonation({
      fundraiser_id,
      donor_address: donorWallet,
      amount,
      tx_hash,
      payment_method: "crypto",
      payment_reference: "",
      currency: "ETH",
    });

    const donationHash = generateDonationHash({
      donationId,
      fundraiser_id,
      donor_address: donorWallet,
      amount,
      payment_method: "crypto",
      payment_reference: "",
      donatedAt,
    });

    try {
      const { anchorTxHash } = await anchorDonation(donationHash);

      // WHY: Persist anchor_tx_hash after anchoring succeeds.
      await db.promise().query(
        "UPDATE donations SET anchor_tx_hash = ? WHERE donation_id = ?",
        [anchorTxHash, donationId]
      );
    } catch (bcErr) {
      // WHY: Anchoring failure must not rollback SQL donation.
      console.error("Blockchain anchoring failed (MetaMask):", bcErr);
    }

    res.json({
      message: "Donation successful",
      donationId,
    });
  } catch (err) {
    console.error("MetaMask donation controller error:", err);
    throw new ExpressError(500, "Database error during donation: " + err.message);
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


