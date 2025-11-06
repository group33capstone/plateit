#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// __dirname is not available in ESM; derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import recipesRouter from "./routes/recipes.js";
import { generate } from "./config/gemini.js";
import { pool } from "./config/database.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const ENV = process.env || {};

// Serve static files (images) from assets folder
app.use("/assets", express.static(path.join(__dirname, "data/assets")));

// Mount recipes router under /api/recipes so client can POST to /api/recipes
app.use("/api/recipes", recipesRouter);
// app.use("/locations", locationsRouter);
// app.use("/events", eventsRouter);

// Server ENV will be passed into the generate implementation in config/gemini.js

app.post("/api/genai/generate", async (req, res) => {
  try {
    const result = await generate(req, ENV);
    return res.status(result.status || 200).json(result.body);
  } catch (err) {
    console.error("genai handler error", err);
    return res.status(500).json({ error: String(err) });
  }
});

// Health check: return the database name the server is connected to.
app.get("/api/health/db", async (req, res) => {
  try {
    const r = await pool.query("SELECT current_database() as db");
    return res.json({ database: r.rows[0].db });
  } catch (err) {
    console.error("DB health check failed", err);
    return res.status(503).json({ error: "DB unavailable" });
  }
});

const port = ENV.PORT || 3001;
app.listen(port, () => {
  console.log(`GenAI proxy listening on http://localhost:${port}`);
});
