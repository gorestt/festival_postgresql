const express = require("express");
const router = express.Router();

router.get("/about", (req, res) => {
  res.render("about/index", {
    title: "Об авторе",
    author: {
      fullName: "Аминева Л. И.",
      group: "ДПИ23-1, Финансовый университет",
      stack: "Node.js (Express), PostgreSQL, HTML/CSS (EJS), Bootstrap 5, Chart.js",
      started: "01.11.2025",
      finished: "24.12.2025"
    }
  });
});

module.exports = router;
