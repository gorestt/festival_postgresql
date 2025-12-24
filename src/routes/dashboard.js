const express = require("express");
const router = express.Router();
const { query } = require("../db");

router.get("/dashboard", async (req, res, next) => {
  try {
    const [users, festivals, performances] = await Promise.all([
      query("SELECT COUNT(*)::int AS c FROM users"),
      query("SELECT COUNT(*)::int AS c FROM festivals"),
      query("SELECT COUNT(*)::int AS c FROM performances")
    ]);

    const recent = await query(`
      SELECT f.*,
        COALESCE(ROUND(avg(r.rating)::numeric, 2), NULL) AS avg_rating,
        COUNT(r.id)::int AS reviews
      FROM festivals f
      LEFT JOIN ratings r ON r.festival_id=f.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
      LIMIT 6
    `);

    res.render("dashboard/index", {
      title: "Панель управления",
      kpis: { users: users.rows[0].c, festivals: festivals.rows[0].c, performances: performances.rows[0].c },
      recent: recent.rows
    });
  } catch (e) { next(e); }
});

module.exports = router;
