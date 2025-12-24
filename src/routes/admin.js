const express = require("express");
const router = express.Router();
const { query } = require("../db");
const { requireRole } = require("../middleware/auth");

router.get("/admin/users", requireRole(["ADMIN"]), async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const params = [];
    let where = "";
    if (q) { params.push(`%${q}%`); where = "WHERE (full_name ILIKE $1 OR email ILIKE $1)"; }
    const users = await query(`SELECT id, full_name, email, role, created_at FROM users ${where} ORDER BY created_at DESC`, params);
    res.render("admin/users", { title: "Пользователи", q, users: users.rows });
  } catch (e) { next(e); }
});

router.post("/admin/users/:id/role", requireRole(["ADMIN"]), async (req, res, next) => {
  try {
    const id = req.params.id;
    const role = String(req.body.role || "VIEWER").toUpperCase();
    if (!["VIEWER","ORGANIZER","ADMIN"].includes(role)) {
      req.flash("error", "Недопустимая роль.");
      return res.redirect("/admin/users");
    }
    if (id === req.session.userId && role !== "ADMIN") {
      req.flash("error", "Нельзя снять роль администратора у самого себя.");
      return res.redirect("/admin/users");
    }
    await query("UPDATE users SET role=$1 WHERE id=$2", [role, id]);
    req.flash("success", "Роль пользователя обновлена.");
    res.redirect("/admin/users");
  } catch (e) { next(e); }
});

module.exports = router;
