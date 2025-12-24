require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");

const { attachUserToLocals } = require("./src/middleware/auth");
const routes = require("./src/routes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "src", "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "dev_secret_change_me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax" }
}));

app.use(flash());
app.use(attachUserToLocals);

app.use("/", routes);

app.use((req, res) => res.status(404).render("errors/404", { title: "404" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("errors/500", { title: "500", message: err.message || "Unexpected error" });
});

const port = parseInt(process.env.APP_PORT || "3000", 10);
app.listen(port, () => console.log(`Server started: http://localhost:${port}`));
