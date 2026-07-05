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
  currency,
}) => {
  // WHY: This service must perform exactly one SQL INSERT with no business logic.

  // WHY: Preserve tx_hash behavior (tx_hash || Date.now()) exactly as before.
  const effectiveTxHash = tx_hash || Date.now();

  // WHY: Insert the payment metadata as well so Razorpay and MetaMask can share the same DB recording layer.
  // This uses the existing columns in the `donations` table.
  const sql = `
      INSERT INTO donations 
      (fundraiser_id, donor_address, amount, tx_hash, payment_method, payment_reference, currency, donated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

  const [result] = await db.promise().query(sql, [
    fundraiser_id,
    donor_address,
    amount,
    effectiveTxHash,
    payment_method,
    payment_reference,
    currency || "ETH",
  ]);

  // WHY: Return donatedAt so controllers can deterministically compute the anchored hash
  // without querying immediately after INSERT.
  const donatedAt = new Date();

  return { donationId: result.insertId, donatedAt };
};



