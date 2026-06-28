import db from "../db/index.js";

// WHY: Keep DB INSERT logic in a dedicated service so controllers focus on HTTP-level concerns
// (validation, auth, response shaping) and the DB layer stays reusable.

export const recordDonation = async ({
  fundraiser_id,
  donor_address,
  amount,
  tx_hash,
  payment_method,
  payment_reference,
}) => {
  // WHY: This service must perform exactly one SQL INSERT with no business logic.
  // NOTE: current schema/MetaMask donate controller only uses these columns.
  // Payment-related fields are intentionally ignored here to preserve existing behavior.

  const sql = `
      INSERT INTO donations 
      (fundraiser_id, donor_address, amount, tx_hash, donated_at)
      VALUES (?, ?, ?, ?, NOW())
    `;

  // WHY: donation.controller.js historically used tx_hash || Date.now() for the insert.
  const effectiveTxHash = tx_hash || Date.now();

  const [result] = await db.promise().query(sql, [
    fundraiser_id,
    donor_address,
    amount,
    effectiveTxHash,
  ]);

  return result.insertId;
};

