import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure we load the project's root .env (two levels up from server/config)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", "..", ".env");
dotenv.config({ path: envPath });

const { Pool } = pg;

// Only enable SSL when the environment indicates it (e.g. PGSSLMODE or a non-local host).
const shouldUseSsl = (() => {
  const host = process.env.PGHOST || "";
  const pgsslmode = (process.env.PGSSLMODE || "").toLowerCase();
  if (pgsslmode === "disable" || host.includes("localhost") || host === "")
    return false;
  return true;
})();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
});

// Export both a named and default export so callers can import either style.
export { pool };
export default pool;
