import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve the project root .env relative to this file so dotenv works
// regardless of the current working directory when the script is run.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// server/config -> up two levels to project root
const envPath = path.join(__dirname, "..", "..", ".env");
dotenv.config({ path: envPath });

export { dotenv };
