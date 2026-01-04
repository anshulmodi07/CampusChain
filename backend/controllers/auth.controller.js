import bcrypt from "bcrypt";//Used for password hashing and password comparison
import jwt from "jsonwebtoken";//Used to create JWT tokens
// Token proves the user is logged in
import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

// --------- SIGNUP ----------
// password hashing is async
// DB queries are async
export const signup = async (req, res) => {
  const { name, email, password, role, wallet_address } = req.body;

  if (!name || !email || !password || !role) {
    throw new ExpressError(400, "Missing required fields");
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const sql = `
      INSERT INTO users (name, email, password_hash, role, wallet_address)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db
      .promise()
      .query(sql, [name, email, password_hash, role, wallet_address]);

    const userId = result.insertId;

    if (role === "donor") {
      await db.promise().query(
        "INSERT INTO donor_details (donor_id) VALUES (?)",
        [userId]
      );
    }

    if (role === "ngo") {
      await db.promise().query(
        "INSERT INTO ngo_details (ngo_id) VALUES (?)",
        [userId]
      );
    }

    res.json({ message: "Signup successful", id: userId });

  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      throw new ExpressError(400, "Email already exists");
    }
    throw new ExpressError(500, "Database error during signup");
  }
};

// --------- LOGIN ----------
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ExpressError(400, "Missing email or password");
  }

  const sql = "SELECT * FROM users WHERE email = ?";

  const [rows] = await db.promise().query(sql, [email]);

  if (rows.length === 0) {
    throw new ExpressError(400, "User not found");
  }

  const user = rows[0];

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new ExpressError(400, "Incorrect password");
  }

//   Data stored inside JWT
// Later becomes req.user
  const payload = {
    id: user.id,
    role: user.role,
    wallet: user.wallet_address,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

  res.json({
    message: "Login successful",
    token,
    role: user.role,
    wallet: user.wallet_address,
  });
};
