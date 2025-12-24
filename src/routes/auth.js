const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const { query } = require("../db");

router.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/dashboard");
  res.render("auth/login", { title: "Вход" });
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query("SELECT id, email, password_hash, role FROM users WHERE email=$1",
      [String(email || "").trim().toLowerCase()]);
    const user = rows[0];
    if (!user) { req.flash("error", "Неверный email или пароль."); return res.redirect("/login"); }
    const ok = await bcrypt.compare(String(password || ""), user.password_hash);
    if (!ok) { req.flash("error", "Неверный email или пароль."); return res.redirect("/login"); }
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.flash("success", "Вы успешно вошли в систему.");
    return res.redirect("/dashboard");
  } catch (e) { next(e); }
});

router.get("/register", (req, res) => {
  if (req.session.userId) return res.redirect("/dashboard");
  res.render("auth/register", { title: "Регистрация" });
});

router.post("/register", async (req, res, next) => {
  try {
    const fullName = String(req.body.full_name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (fullName.length < 3) { req.flash("error", "ФИО должно содержать минимум 3 символа."); return res.redirect("/register"); }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) { req.flash("error", "Некорректный email."); return res.redirect("/register"); }
    if (password.length < 8) { req.flash("error", "Пароль должен быть не короче 8 символов."); return res.redirect("/register"); }

    const hash = await bcrypt.hash(password, 12);
    await query("INSERT INTO users(full_name, email, password_hash, role) VALUES($1,$2,$3,'VIEWER')",
      [fullName, email, hash]);
    req.flash("success", "Регистрация выполнена. Теперь войдите в систему.");
    return res.redirect("/login");
  } catch (e) {
    if (String(e.message || "").includes("users_email_key")) {
      req.flash("error", "Пользователь с таким email уже существует.");
      return res.redirect("/register");
    }
    next(e);
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
