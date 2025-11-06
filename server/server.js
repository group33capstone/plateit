#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import recipesRouter from "./routes/recipes.js";
import { generate } from "./config/gemini.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Read environment safely
let ENV = {};
try {
  const globalObject = Function("return this")();
  ENV =
    (globalObject &&
      globalObject["process"] &&
      globalObject["process"]["env"]) ||
    {};
} catch {
  ENV = {};
}

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

const port = ENV.PORT || 3001;
app.listen(port, () => {
  console.log(`GenAI proxy listening on http://localhost:${port}`);
});
