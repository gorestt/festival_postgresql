const express = require("express");
const router = express.Router();
const { query } = require("../db");

router.get("/stats", async (req, res, next) => {
  try {
    const totals = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM festivals) AS festivals,
        (SELECT COUNT(*)::int FROM artists) AS artists,
        (SELECT COUNT(*)::int FROM performances) AS performances,
        (SELECT COUNT(*)::int FROM ratings) AS reviews
    `);

    const avgWait = await query(`
      WITH ordered AS (
        SELECT stage_id, start_time,
               LAG(end_time) OVER (PARTITION BY stage_id ORDER BY start_time) AS prev_end
        FROM performances
      ),
      gaps AS (
        SELECT EXTRACT(EPOCH FROM (start_time - prev_end))/60.0 AS gap_min
        FROM ordered
        WHERE prev_end IS NOT NULL
      )
      SELECT COALESCE(ROUND(AVG(gap_min)::numeric, 2), 0) AS avg_gap_min
      FROM gaps
    `);

    const ratingsChart = await query(`
      SELECT f.name,
             COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) AS avg_rating,
             COUNT(r.id)::int AS reviews
      FROM festivals f
      LEFT JOIN ratings r ON r.festival_id=f.id
      GROUP BY f.id
      ORDER BY avg_rating DESC, reviews DESC, f.name ASC
      LIMIT 10
    `);

    res.render("stats/index", { title: "Статистика", totals: totals.rows[0], avgGapMin: avgWait.rows[0].avg_gap_min, chart: ratingsChart.rows });
  } catch (e) { next(e); }
});

module.exports = router;
