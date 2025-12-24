const express = require("express");
const router = express.Router();
const { query } = require("../db");
const { requireRole } = require("../middleware/auth");
const { safeSort, safeOrder } = require("../utils/sql");

router.get("/festivals", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const sort = safeSort(String(req.query.sort || ""), ["name","city","start_date","end_date","genre"], "start_date");
    const order = safeOrder(req.query.order);
    const params = [];
    let where = "";
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE (f.name ILIKE $1 OR f.city ILIKE $1 OR f.genre ILIKE $1)`;
    }
    const list = await query(`
      SELECT f.*,
        COALESCE(ROUND(avg(r.rating)::numeric, 2), NULL) AS avg_rating,
        COUNT(r.id)::int AS reviews
      FROM festivals f
      LEFT JOIN ratings r ON r.festival_id=f.id
      ${where}
      GROUP BY f.id
      ORDER BY ${sort} ${order}, f.name ASC
    `, params);

    res.render("festivals/list", { title: "Фестивали", q, sort, order, festivals: list.rows });
  } catch (e) { next(e); }
});

router.get("/festivals/new", requireRole(["ORGANIZER","ADMIN"]), (req, res) => {
  res.render("festivals/form", { title: "Добавить фестиваль", mode: "create", festival: null });
});

router.post("/festivals", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const b = req.body;
    const name = String(b.name || "").trim();
    if (name.length < 3) { req.flash("error", "Название слишком короткое."); return res.redirect("/festivals/new"); }
    await query(`
      INSERT INTO festivals(name,city,country,start_date,end_date,genre,website,description,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [name, b.city, b.country, b.start_date, b.end_date, b.genre, b.website || null, b.description || null, req.session.userId]);
    req.flash("success", "Фестиваль добавлен.");
    res.redirect("/festivals");
  } catch (e) { next(e); }
});

router.get("/festivals/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const f = await query(`
      SELECT f.*,
        COALESCE(ROUND(avg(r.rating)::numeric, 2), NULL) AS avg_rating,
        COUNT(r.id)::int AS reviews
      FROM festivals f
      LEFT JOIN ratings r ON r.festival_id=f.id
      WHERE f.id=$1
      GROUP BY f.id
    `, [id]);
    if (!f.rows[0]) return res.status(404).render("errors/404", { title: "404" });

    const stages = await query("SELECT * FROM stages WHERE festival_id=$1 ORDER BY name ASC", [id]);
    const performances = await query(`
      SELECT p.*, a.name AS artist_name, s.name AS stage_name
      FROM performances p
      JOIN artists a ON a.id=p.artist_id
      JOIN stages s ON s.id=p.stage_id
      WHERE p.festival_id=$1
      ORDER BY p.start_time ASC
    `, [id]);

    const myRating = await query("SELECT * FROM ratings WHERE festival_id=$1 AND user_id=$2", [id, req.session.userId]);
    const reviews = await query(`
      SELECT r.*, u.full_name
      FROM ratings r
      JOIN users u ON u.id=r.user_id
      WHERE r.festival_id=$1
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [id]);

    res.render("festivals/detail", {
      title: f.rows[0].name,
      festival: f.rows[0],
      stages: stages.rows,
      performances: performances.rows,
      myRating: myRating.rows[0] || null,
      reviews: reviews.rows
    });
  } catch (e) { next(e); }
});

router.get("/festivals/:id/edit", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const f = await query("SELECT * FROM festivals WHERE id=$1", [req.params.id]);
    if (!f.rows[0]) return res.status(404).render("errors/404", { title: "404" });
    res.render("festivals/form", { title: "Редактировать фестиваль", mode: "edit", festival: f.rows[0] });
  } catch (e) { next(e); }
});

router.put("/festivals/:id", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const id = req.params.id;
    const b = req.body;
    await query(`
      UPDATE festivals SET name=$1, city=$2, country=$3, start_date=$4, end_date=$5, genre=$6, website=$7, description=$8
      WHERE id=$9
    `, [b.name, b.city, b.country, b.start_date, b.end_date, b.genre, b.website || null, b.description || null, id]);
    req.flash("success", "Изменения сохранены.");
    res.redirect(`/festivals/${id}`);
  } catch (e) { next(e); }
});

router.delete("/festivals/:id", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    await query("DELETE FROM festivals WHERE id=$1", [req.params.id]);
    req.flash("success", "Фестиваль удален.");
    res.redirect("/festivals");
  } catch (e) { next(e); }
});

router.post("/festivals/:id/rate", async (req, res, next) => {
  try {
    const festivalId = req.params.id;
    const rating = parseInt(req.body.rating, 10);
    const review = String(req.body.review || "").trim() || null;
    if (!(rating >= 1 && rating <= 5)) { req.flash("error", "Оценка должна быть от 1 до 5."); return res.redirect(`/festivals/${festivalId}`); }
    await query(`
      INSERT INTO ratings(festival_id,user_id,rating,review)
      VALUES($1,$2,$3,$4)
      ON CONFLICT (festival_id,user_id) DO UPDATE SET rating=EXCLUDED.rating, review=EXCLUDED.review, created_at=NOW()
    `, [festivalId, req.session.userId, rating, review]);
    req.flash("success", "Спасибо! Оценка сохранена.");
    res.redirect(`/festivals/${festivalId}`);
  } catch (e) { next(e); }
});

module.exports = router;
