import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure we load the project's root .env (two levels up from server/config)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", "..", ".env");
dotenv.config({ path: envPath });

// Decide SSL config: enabled unless PGSSLMODE=disable or host looks local/empty.
const host = process.env.PGHOST || "";
const pgsslmode = (process.env.PGSSLMODE || "").toLowerCase();
const ssl =
  pgsslmode === "disable" || host === "" || host.includes("localhost")
    ? false
    : { rejectUnauthorized: false };

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl,
});

// Export both a named and default export so callers can import either style.
export { pool };
export default pool;
