import ExpressError from "../utils/ExpressError.js";
import db from "../db/index.js";
import { verifyDonation, generateDonationHash } from "../services/blockchain.service.js";


// NOTE: Keep controllers thin: HTTP auth + response shaping only.

export const verifyDonationProof = async (req, res) => {
  const { donationId } = req.params;

  if (!donationId) {
    throw new ExpressError(400, "donationId is required");
  }

  // WHY: Donor can verify only their own donations.
  const [rows] = await db.promise().query(
    `SELECT donation_id, fundraiser_id, donor_address, amount, payment_method, payment_reference, donated_at, anchor_tx_hash
     FROM donations
     WHERE donation_id = ? AND donor_address = ?
     LIMIT 1`,
    [donationId, req.user.wallet]
  );

  if (!rows || rows.length === 0) {
    return res.status(404).json({ success: false, message: "Donation not found" });
  }

  const d = rows[0];

  const donationHash = generateDonationHash({
    donationId: d.donation_id,
    fundraiser_id: d.fundraiser_id,
    donor_address: d.donor_address,
    amount: d.amount,
    payment_method: d.payment_method,
    payment_reference: d.payment_reference,
    donatedAt: d.donated_at,
  });

  // WHY: On-chain verification is a pure read.
  const verified = await verifyDonation(donationHash);

  return res.json({
    verified,
    donationHash,
    anchorTxHash: d.anchor_tx_hash,
    paymentMethod: d.payment_method,
    paymentReference: d.payment_reference,
  });
};

