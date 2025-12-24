const express = require("express");
const router = express.Router();
const { query } = require("../db");
const { requireRole } = require("../middleware/auth");

router.get("/schedule", async (req, res, next) => {
  try {
    const festivalId = String(req.query.festival || "");
    const festivals = await query("SELECT id, name FROM festivals ORDER BY start_date DESC, name ASC");
    const params = [];
    let where = "WHERE 1=1";
    if (festivalId) {
      params.push(festivalId);
      where += ` AND p.festival_id=$1`;
    }
    const list = await query(`
      SELECT p.*, f.name AS festival_name, a.name AS artist_name, s.name AS stage_name
      FROM performances p
      JOIN festivals f ON f.id=p.festival_id
      JOIN artists a ON a.id=p.artist_id
      JOIN stages s ON s.id=p.stage_id
      ${where}
      ORDER BY p.start_time ASC
      LIMIT 500
    `, params);

    res.render("schedule/list", { title: "Расписание", festivals: festivals.rows, festivalId, items: list.rows });
  } catch (e) { next(e); }
});

router.get("/schedule/new", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const festivals = await query("SELECT id, name FROM festivals ORDER BY start_date DESC");
    const artists = await query("SELECT id, name FROM artists ORDER BY name ASC");
    const stages = await query(`
      SELECT s.id, s.name, s.festival_id, f.name AS festival_name
      FROM stages s JOIN festivals f ON f.id=s.festival_id
      ORDER BY f.start_date DESC, s.name ASC
    `);
    res.render("schedule/form", { title: "Добавить выступление", mode: "create", item: null, festivals: festivals.rows, artists: artists.rows, stages: stages.rows });
  } catch (e) { next(e); }
});

router.post("/schedule", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const b = req.body;
    await query(`
      INSERT INTO performances(festival_id,stage_id,artist_id,start_time,end_time,expected_attendance,notes)
      VALUES($1,$2,$3,$4,$5,$6,$7)
    `, [b.festival_id, b.stage_id, b.artist_id, b.start_time, b.end_time, b.expected_attendance || null, b.notes || null]);
    req.flash("success", "Выступление добавлено.");
    res.redirect("/schedule");
  } catch (e) { next(e); }
});

router.get("/schedule/:id/edit", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const item = await query("SELECT * FROM performances WHERE id=$1", [req.params.id]);
    if (!item.rows[0]) return res.status(404).render("errors/404", { title: "404" });
    const festivals = await query("SELECT id, name FROM festivals ORDER BY start_date DESC");
    const artists = await query("SELECT id, name FROM artists ORDER BY name ASC");
    const stages = await query(`
      SELECT s.id, s.name, s.festival_id, f.name AS festival_name
      FROM stages s JOIN festivals f ON f.id=s.festival_id
      ORDER BY f.start_date DESC, s.name ASC
    `);
    res.render("schedule/form", { title: "Редактировать выступление", mode: "edit", item: item.rows[0], festivals: festivals.rows, artists: artists.rows, stages: stages.rows });
  } catch (e) { next(e); }
});

router.put("/schedule/:id", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    const b = req.body;
    await query(`
      UPDATE performances SET festival_id=$1, stage_id=$2, artist_id=$3, start_time=$4, end_time=$5, expected_attendance=$6, notes=$7
      WHERE id=$8
    `, [b.festival_id, b.stage_id, b.artist_id, b.start_time, b.end_time, b.expected_attendance || null, b.notes || null, req.params.id]);
    req.flash("success", "Изменения сохранены.");
    res.redirect("/schedule");
  } catch (e) { next(e); }
});

router.delete("/schedule/:id", requireRole(["ORGANIZER","ADMIN"]), async (req, res, next) => {
  try {
    await query("DELETE FROM performances WHERE id=$1", [req.params.id]);
    req.flash("success", "Выступление удалено.");
    res.redirect("/schedule");
  } catch (e) { next(e); }
});

module.exports = router;
