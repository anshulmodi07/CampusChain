import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";

// -------- ALL FUNDRAISERS --------
export const getAllFundraisers = async (req, res) => {
  try {
    const sql = `
      SELECT f.fundraiser_id AS fundraiserId, f.title, f.description, f.goal,
      f.owner_wallet AS ownerWallet, f.fundraiser_type AS fundraiserType,
      f.category, f.people_affected AS peopleAffected, f.status,
      IFNULL(SUM(CASE WHEN d.currency = 'INR' THEN d.amount / 300000.0 ELSE d.amount END), 0) AS raised
      FROM fundraisers f
      LEFT JOIN donations d ON f.fundraiser_id = d.fundraiser_id
      GROUP BY f.fundraiser_id
    `;

    const [rows] = await db.promise().query(sql);
    res.json(rows);

  } catch (err) {
    throw new ExpressError(500, "Database error fetching fundraisers");
  }
};

// -------- FUNDRAISER BY ID --------
export const getFundraiserById = async (req, res) => {
  try {
    const sql = `
      SELECT f.fundraiser_id AS fundraiserId, f.title, f.description, f.goal,
      f.owner_wallet AS ownerWallet, f.fundraiser_type AS fundraiserType,
      f.category, f.people_affected AS peopleAffected, f.created_at AS createdAt, f.status,
      IFNULL(SUM(CASE WHEN d.currency = 'INR' THEN d.amount / 300000.0 ELSE d.amount END), 0) AS raised
      FROM fundraisers f
      LEFT JOIN donations d ON f.fundraiser_id = d.fundraiser_id
      WHERE f.fundraiser_id = ?
      GROUP BY f.fundraiser_id
    `;

    const [rows] = await db.promise().query(sql, [req.params.id]);

    if (!rows.length) {
      throw new ExpressError(404, "Fundraiser not found");
    }

    res.json(rows[0]);

  } catch (err) {
    throw err.status ? err : new ExpressError(500, "Database error");
  }
};

// -------- CREATE FUNDRAISER --------
export const createFundraiser = async (req, res) => {
  const {
    title, description, goal,
    fundraiser_type, category, people_affected
  } = req.body;

  const owner_wallet = req.user.wallet;

  if (!title || !goal) {
    throw new ExpressError(400, "Missing fundraiser data");
  }

  try {
    const sql = `
      INSERT INTO fundraisers
      (title, description, goal, owner_wallet, fundraiser_type, category, people_affected)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.promise().query(sql, [
      title, description, goal,
      owner_wallet, fundraiser_type, category, people_affected
    ]);

    res.json({
      message: "Fundraiser created",
      fundraiserId: result.insertId
    });

  } catch (err) {
    throw new ExpressError(500, "Database error creating fundraiser");
  }
};

// -------- MY FUNDRAISERS --------
export const getMyFundraisers = async (req, res) => {
  try {
    const sql = `
      SELECT f.fundraiser_id AS fundraiserId, f.title, f.description, f.goal,
      f.owner_wallet AS ownerWallet, f.fundraiser_type AS fundraiserType,
      f.category, f.people_affected AS peopleAffected, f.created_at, f.status,
      IFNULL(SUM(CASE WHEN d.currency = 'INR' THEN d.amount / 300000.0 ELSE d.amount END), 0) AS raised
      FROM fundraisers f
      LEFT JOIN donations d ON f.fundraiser_id = d.fundraiser_id
      WHERE f.owner_wallet = ?
      GROUP BY f.fundraiser_id
    `;
    const [rows] = await db.promise().query(sql, [req.user.wallet]);

    res.json(rows);

  } catch (err) {
    throw new ExpressError(500, "Database error fetching NGO fundraisers");
  }
};

// -------- TOTAL RAISED --------
export const getTotalRaised = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT COALESCE(SUM(CASE WHEN currency = 'INR' THEN amount / 300000.0 ELSE amount END), 0) AS totalRaised FROM donations WHERE fundraiser_id = ?",
      [req.params.id]
    );

    res.json({ totalRaised: rows[0].totalRaised });

  } catch (err) {
    throw new ExpressError(500, "Database error calculating total raised");
  }
};

// -------- UPDATE STATUS --------
export const updateFundraiserStatus = async (req, res) => {
  const fundraiserId = parseInt(req.params.id);
  const { status } = req.body; // 'active' or 'closed'
  const userWallet = req.user.wallet;

  if (isNaN(fundraiserId) || !status) {
    throw new ExpressError(400, "Missing status or fundraiser ID");
  }

  try {
    const [result] = await db.promise().query(
      "UPDATE fundraisers SET status = ? WHERE fundraiser_id = ? AND owner_wallet = ?",
      [status, fundraiserId, userWallet]
    );

    if (result.affectedRows === 0) {
      throw new ExpressError(403, "Forbidden: You do not own this fundraiser or it does not exist");
    }

    res.json({ success: true, message: `Fundraiser status updated to ${status}` });
  } catch (err) {
    throw err.status ? err : new ExpressError(500, "Database error updating status");
  }
};

// -------- UPDATE DESCRIPTION --------
export const updateFundraiserDescription = async (req, res) => {
  const fundraiserId = parseInt(req.params.id);
  const { description } = req.body;
  const userWallet = req.user.wallet;

  if (isNaN(fundraiserId) || description === undefined) {
    throw new ExpressError(400, "Missing description or fundraiser ID");
  }

  try {
    const [result] = await db.promise().query(
      "UPDATE fundraisers SET description = ? WHERE fundraiser_id = ? AND owner_wallet = ?",
      [description, fundraiserId, userWallet]
    );

    if (result.affectedRows === 0) {
      throw new ExpressError(403, "Forbidden: You do not own this fundraiser or it does not exist");
    }

    res.json({ success: true, message: "Description updated successfully" });
  } catch (err) {
    throw err.status ? err : new ExpressError(500, "Database error updating description");
  }
};
