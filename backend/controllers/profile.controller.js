import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";

export const getProfile = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    let sql = "";
    if (role === "donor") {
      sql = `
        SELECT u.id, u.name, u.email, u.role, u.wallet_address AS wallet_address,
               d.phone, d.city, d.state, d.country, d.donation_preference
        FROM users u
        LEFT JOIN donor_details d ON u.id = d.donor_id
        WHERE u.id = ?
      `;
    } else {
      sql = `
        SELECT u.id, u.name, u.email, u.role, u.wallet_address AS wallet_address,
               n.organization_name, n.registration_number, n.contact_person, n.contact_phone, n.address
        FROM users u
        LEFT JOIN ngo_details n ON u.id = n.ngo_id
        WHERE u.id = ?
      `;
    }

    const [rows] = await db.promise().query(sql, [userId]);
    if (rows.length === 0) {
      throw new ExpressError(404, "User profile not found");
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Get profile error:", err);
    throw new ExpressError(500, "Database error fetching profile: " + err.message);
  }
};

export const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  const {
    name, wallet_address, phone, city, state, country,
    donation_preference, organization_name,
    registration_number, contact_person,
    contact_phone, address
  } = req.body;

  try {
    // update common user info
    await db.promise().query(
      "UPDATE users SET name = ?, wallet_address = ? WHERE id = ?",
      [name, wallet_address || null, userId]
    );

    if (role === "donor") {
      await db.promise().query(
        `UPDATE donor_details
         SET phone = ?, city = ?, state = ?, country = ?, donation_preference = ?
         WHERE donor_id = ?`,
        [phone, city, state, country, donation_preference, userId]
      );
    }

    if (role === "ngo") {
      await db.promise().query(
        `UPDATE ngo_details
         SET organization_name = ?, registration_number = ?, contact_person = ?, contact_phone = ?, address = ?
         WHERE ngo_id = ?`,
        [organization_name, registration_number, contact_person, contact_phone, address, userId]
      );
    }

    res.json({ message: "Profile updated successfully" });

  } catch (err) {
    throw new ExpressError(500, "Database error updating profile");
  }
};
