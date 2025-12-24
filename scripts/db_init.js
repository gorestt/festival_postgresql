require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function assertSafeIdent(name, fallback) {
  const v = (name || fallback || "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v)) {
    throw new Error(
      `Unsafe identifier: '${name}'. Use only letters, digits and underscore, and start with a letter/underscore.`
    );
  }
  return v;
}


function escapeLiteral(v) {
  // escape single quotes for SQL string literal
  return String(v ?? "").replace(/'/g, "''");
}

async function ensureRoleAndDb() {
  const adminUser = process.env.PGADMIN_USER || "postgres";
  const adminPass = process.env.PGADMIN_PASSWORD || "";
  const host = process.env.PGHOST || "localhost";
  const port = parseInt(process.env.PGPORT || "5432", 10);
  const appDb = assertSafeIdent(process.env.PGDATABASE, "festivaldb");
  const appUser = assertSafeIdent(process.env.PGUSER, "festival_app");
  const appPass = process.env.PGPASSWORD || "festival_app";

  const admin = new Client({ host, port, database: "postgres", user: adminUser, password: adminPass });
  await admin.connect();

  // Create role if not exists; always ensure password matches .env
  const roleExists = await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [appUser]);
  if (roleExists.rowCount === 0) {
    const passLit = escapeLiteral(appPass);
    await admin.query(`CREATE ROLE ${appUser} LOGIN PASSWORD '${passLit}';`);
  } else {
    const passLit = escapeLiteral(appPass);
    await admin.query(`ALTER ROLE ${appUser} WITH PASSWORD '${passLit}';`);
  }

  // Create database if not exists
  const dbExists = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [appDb]);
  if (dbExists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${appDb} OWNER ${appUser};`);
  }

  // Ensure privileges
  await admin.query(`GRANT ALL PRIVILEGES ON DATABASE ${appDb} TO ${appUser};`);

  // Ensure the app user can create objects in public schema
  const adminInAppDb = new Client({ host, port, database: appDb, user: adminUser, password: adminPass });
  await adminInAppDb.connect();
  await adminInAppDb.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${appUser};`);
  await adminInAppDb.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${appUser};`);
  await adminInAppDb.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${appUser};`);
  await adminInAppDb.end();

  await admin.end();
}

async function applySchema() {
  const host = process.env.PGHOST || "localhost";
  const port = parseInt(process.env.PGPORT || "5432", 10);
  const database = process.env.PGDATABASE || "festivaldb";
  const user = process.env.PGUSER || "festival_app";
  const password = process.env.PGPASSWORD || "festival_app";

  const client = new Client({ host, port, database, user, password });
  await client.connect();

  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  // Split by semicolons cautiously? We'll just run full script.
  await client.query(sql);

  await client.end();
}

(async () => {
  try {
    console.log("Initializing database...");
    await ensureRoleAndDb();
    await applySchema();
    console.log("DB init done.");
  } catch (e) {
    console.error("DB init failed:", e.message);
    process.exit(1);
  }
})();
