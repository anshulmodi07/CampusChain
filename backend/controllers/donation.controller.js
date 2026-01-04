import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";

// -------- DONATE --------
export const donate = async (req, res) => {
  let { fundraiser_id, amount, tx_hash } = req.body;
  const donorWallet = req.user.wallet;

  fundraiser_id = parseInt(fundraiser_id);
  amount = parseFloat(amount);

  if (isNaN(fundraiser_id) || isNaN(amount)) {
    throw new ExpressError(400, "Invalid donation data");
  }

  try {
    const sql = `
      INSERT INTO donations 
      (fundraiser_id, donor_address, amount, tx_hash, donated_at)
      VALUES (?, ?, ?, ?, NOW())
    `;

    const [result] = await db.promise().query(
      sql,
      [fundraiser_id, donorWallet, amount, tx_hash || Date.now()]
    );

    res.json({
      message: "Donation successful",
      donationId: result.insertId
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
