#!/usr/bin/env node
import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", "..", ".env");
const dmod = await import("dotenv");
const dotenvImpl = dmod?.default || dmod;
if (dotenvImpl && typeof dotenvImpl.config === "function") {
  dotenvImpl.config({ path: envPath });
}

const db = await import("./database.js");
const { pool } = db;

async function run() {
  try {
    console.log("Adding raw_markdown column (if missing)...");
    await pool.query(
      "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS raw_markdown TEXT;"
    );
    console.log("✅ raw_markdown column ensured");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
