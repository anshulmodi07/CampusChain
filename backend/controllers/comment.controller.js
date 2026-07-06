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
      `SELECT comments.comment_id, users.name, comments.comment_text, comments.commented_at AS created_at
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

// -------- DELETE COMMENT --------
export const deleteComment = async (req, res) => {
  const commentId = parseInt(req.params.commentId);
  const userWallet = req.user.wallet; // Logged-in NGO wallet address

  if (isNaN(commentId)) {
    throw new ExpressError(400, "Invalid comment ID");
  }

  try {
    // Check if user owns the fundraiser of the comment
    const [rows] = await db.promise().query(
      `SELECT c.comment_id, f.owner_wallet
       FROM comments c
       JOIN fundraisers f ON c.fundraiser_id = f.fundraiser_id
       WHERE c.comment_id = ?`,
      [commentId]
    );

    if (rows.length === 0) {
      throw new ExpressError(404, "Comment not found");
    }

    if (rows[0].owner_wallet.toLowerCase() !== userWallet.toLowerCase()) {
      throw new ExpressError(403, "Forbidden: You are not the owner of this fundraiser");
    }

    // Delete comment
    await db.promise().query(
      "DELETE FROM comments WHERE comment_id = ?",
      [commentId]
    );

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Delete comment error:", err);
    throw err.status ? err : new ExpressError(500, "Database error deleting comment");
  }
};
