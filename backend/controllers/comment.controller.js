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
    await db.promise().query(
      `INSERT INTO comments 
       (fundraiser_id, user_id, comment_text, created_at)
       VALUES (?, ?, ?, NOW())`,
      [fundraiser_id, user_id, comment_text]
    );

    res.json({ message: "Comment added" });

  } catch (err) {
    throw new ExpressError(500, "Database error while adding comment");
  }
};

// -------- GET COMMENTS --------
export const getComments = async (req, res) => {
  const fundraiserId = req.params.id;

  try {
    const [rows] = await db.promise().query(
      `SELECT users.name, comments.comment_text, comments.created_at
       FROM comments
       JOIN users ON comments.user_id = users.id
       WHERE fundraiser_id = ?
       ORDER BY created_at DESC`,
      [fundraiserId]
    );

    res.json(rows);

  } catch (err) {
    throw new ExpressError(500, "Database error while fetching comments");
  }
};
