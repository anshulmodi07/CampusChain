import db from "../db/index.js";
import ExpressError from "../utils/ExpressError.js";

// -------- ADD COMMENT --------
export const addComment = async (req, res) => {
  const { fundraiser_id, comment_text } = req.body;
  const user_id = req.user.id;

  if (!fundraiser_id || !comment_text) {
    throw new ExpressError(400, "Missing comment data");
  }

  try {
    const createdAt = new Date();
    await db.promise().query(
      `INSERT INTO comments 
       (fundraiser_id, user_id, comment_text, commented_at)
       VALUES (?, ?, ?, ?)`,
      [fundraiser_id, user_id, comment_text, createdAt]
    );

    res.json({ message: "Comment added" });

  } catch (err) {
    console.error("Add comment database error:", err);
    throw new ExpressError(500, "Database error while adding comment: " + err.message);
  }
};

// -------- GET COMMENTS --------
export const getComments = async (req, res) => {
  const fundraiserId = req.params.id;

  try {
    const [rows] = await db.promise().query(
      `SELECT users.name, comments.comment_text, comments.commented_at AS created_at
       FROM comments
       JOIN users ON comments.user_id = users.id
       WHERE fundraiser_id = ?
       ORDER BY commented_at DESC`,
      [fundraiserId]
    );

    res.json(rows);

  } catch (err) {
    console.error("Get comments database error:", err);
    throw new ExpressError(500, "Database error while fetching comments: " + err.message);
  }
};
