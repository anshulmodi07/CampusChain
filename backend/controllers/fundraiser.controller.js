import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";

// -------- ALL FUNDRAISERS --------
export const getAllFundraisers = async (req, res) => {
  try {
    const sql = `
      SELECT f.fundraiser_id AS fundraiserId, f.title, f.description, f.goal,
      f.owner_wallet AS ownerWallet, f.fundraiser_type AS fundraiserType,
      f.category, f.people_affected AS peopleAffected,
      IFNULL(SUM(d.amount), 0) AS raised
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
      SELECT f.*, IFNULL(SUM(d.amount), 0) AS raised
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
    const [rows] = await db.promise().query(
      "SELECT * FROM fundraisers WHERE owner_wallet = ?",
      [req.user.wallet]
    );

    res.json(rows);

  } catch (err) {
    throw new ExpressError(500, "Database error fetching NGO fundraisers");
  }
};

// -------- TOTAL RAISED --------
export const getTotalRaised = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT COALESCE(SUM(amount),0) AS totalRaised FROM donations WHERE fundraiser_id = ?",
      [req.params.id]
    );

    res.json({ totalRaised: rows[0].totalRaised });

  } catch (err) {
    throw new ExpressError(500, "Database error calculating total raised");
  }
};
