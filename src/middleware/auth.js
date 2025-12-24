const { query } = require("../db");

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  return next();
}

function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const role = req.session.userRole;
    if (!role) return res.redirect("/login");
    if (!allowed.includes(role)) {
      req.flash("error", "Недостаточно прав для выполнения операции.");
      return res.redirect("/dashboard");
    }
    return next();
  };
}

async function attachUserToLocals(req, res, next) {
  res.locals.currentUser = null;
  res.locals.flash = {
    error: req.flash("error"),
    success: req.flash("success"),
    info: req.flash("info")
  };
  if (req.session.userId) {
    try {
      const { rows } = await query("SELECT id, full_name, email, role FROM users WHERE id=$1", [req.session.userId]);
      if (rows[0]) res.locals.currentUser = rows[0];
    } catch (e) {}
  }
  res.locals.isRole = (r) => req.session.userRole === r;
  res.locals.isAnyRole = (arr) => arr.includes(req.session.userRole);
  next();
}

module.exports = { requireAuth, requireRole, attachUserToLocals };
