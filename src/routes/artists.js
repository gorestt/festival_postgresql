const express = require("express");
const router = express.Router();
const { query } = require("../db");
const { requireRole } = require("../middleware/auth");
const { safeSort, safeOrder } = require("../utils/sql");

router.get("/artists", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const sort = safeSort(String(req.query.sort || ""), ["name","genre","country","created_at"], "name");
    const order = safeOrder(req.query.order);
    const params = [];
    let where = "";
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE (a.name ILIKE $1 OR a.genre ILIKE $1 OR COALESCE(a.country,'') ILIKE $1)`;
    }
    const list = await query(`
      SELECT a.*,
        (SELECT COUNT(*)::int FROM performances p WHERE p.artist_id=a.id) AS gigs
      FROM artists a
      ${where}
      ORDER BY ${sort} ${order}, a.name ASC
    `, params);
    res.render("artists/list", { title: "Артисты", q, sort, order, artists: list.rows });
  } catch (e) { next(e); }
});

router.get("/artists/new", requireRole(["ORGANIZER","ADMIN"]), (req, res) => {
  res.render("artists/form", { title: "Добавить артиста", mode: "create", artist: null });
});

router.post("/artists", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const b = req.body;
    const name = String(b.name || "").trim();
    if (name.length < 2) { req.flash("error", "Имя артиста слишком короткое."); return res.redirect("/artists/new"); }
    await query(`
      INSERT INTO artists(name,genre,country,description,created_by)
      VALUES($1,$2,$3,$4,$5)
    `, [name, b.genre || "Unknown", b.country || null, b.description || null, req.session.userId]);
    req.flash("success", "Артист добавлен.");
    res.redirect("/artists");
  } catch (e) { next(e); }
});

router.get("/artists/:id/edit", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const a = await query("SELECT * FROM artists WHERE id=$1", [req.params.id]);
    if (!a.rows[0]) return res.status(404).render("errors/404", { title: "404" });
    res.render("artists/form", { title: "Редактировать артиста", mode: "edit", artist: a.rows[0] });
  } catch (e) { next(e); }
});

router.put("/artists/:id", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const b = req.body;
    await query("UPDATE artists SET name=$1, genre=$2, country=$3, description=$4 WHERE id=$5",
      [b.name, b.genre, b.country || null, b.description || null, req.params.id]);
    req.flash("success", "Изменения сохранены.");
    res.redirect("/artists");
  } catch (e) { next(e); }
});

router.delete("/artists/:id", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    await query("DELETE FROM artists WHERE id=$1", [req.params.id]);
    req.flash("success", "Артист удален.");
    res.redirect("/artists");
  } catch (e) { next(e); }
});

module.exports = router;
