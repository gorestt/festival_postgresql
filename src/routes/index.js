const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

router.get("/", (req, res) => res.redirect(req.session.userId ? "/dashboard" : "/login"));

router.use("/", require("./auth"));
router.use("/", requireAuth, require("./dashboard"));
router.use("/", requireAuth, require("./festivals"));
router.use("/", requireAuth, require("./artists"));
router.use("/", requireAuth, require("./schedule"));
router.use("/", requireAuth, require("./stats"));
router.use("/", requireAuth, require("./about"));
router.use("/", requireAuth, require("./admin"));

module.exports = router;
