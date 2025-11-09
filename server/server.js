#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// OAuth
import passport from "passport";
import session from "express-session";
import { GitHub } from "./config/auth.js";

// __dirname is not available in ESM; derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import recipesRouter from "./routes/recipes.js";
import authRoutes from "./routes/auth.js";
import { generate } from "./config/gemini.js";
import { pool } from "./config/database.js";

const app = express();
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
// Note: origin must be changed later with our published link
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json({ limit: "50mb" }));

passport.use(GitHub);
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

const ENV = process.env || {};

// Auth Routes
app.use("/auth", authRoutes);

// Serve static files (images) from assets folder
app.use("/assets", express.static(path.join(__dirname, "data/assets")));

// Mount recipes router under /api/recipes so client can POST to /api/recipes
app.use("/api/recipes", recipesRouter);

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
