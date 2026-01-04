import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";

export const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  const {
    name, phone, city, state, country,
    donation_preference, organization_name,
    registration_number, contact_person,
    contact_phone, address
  } = req.body;

  try {
    // update common user info
    await db.promise().query(
      "UPDATE users SET name = ? WHERE id = ?",
      [name, userId]
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
