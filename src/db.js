const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || "5432", 10),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 10
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
