import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";
import { ethers } from "ethers";
import {
  generateDonationHash,
  anchorDonation,
} from "./blockchain.service.js";

// NOTE: This service only verifies on-chain proofs.
// Controllers handle HTTP auth + response wiring.

export const verifyDonationProofById = async ({ donationId, donorAddress }) => {
  if (!donationId || !donorAddress) {
    throw new ExpressError(400, "Missing donationId or donorAddress");
  }

  const [rows] = await db.promise().query(
    `SELECT donation_id, fundraiser_id, donor_address, amount, payment_method, payment_reference, donated_at, anchor_tx_hash
     FROM donations
     WHERE donation_id = ? AND donor_address = ?
     LIMIT 1`,
    [donationId, donorAddress]
  );

  if (!rows || rows.length === 0) {
    return { notFound: true };
  }

  const d = rows[0];

  const donationHash = generateDonationHash({
    donationId: d.donation_id,
    fundraiser_id: d.fundraiser_id,
    donor_address: d.donor_address,
    amount: d.amount,
    payment_method: d.payment_method || "",
    payment_reference: d.payment_reference || "",
    donatedAt: d.donated_at,
  });

  // WHY: anchorDonation is not correct for verification.
  // However we keep this service minimal; verification will call contract verifyDonation via a dedicated helper.
  // For now, this will be implemented in blockchain.service.js.

  throw new ExpressError(500, "verifyDonationProofById not fully implemented yet");
};

