import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });
async function fix() {
    const connectionString = process.env.DATABASE_URL?.replace("localhost", "127.0.0.1");
    if (!connectionString) {
        console.error("DATABASE_URL not found");
        return;
    }
    const client = new pg.Client({
        connectionString,
        host: "127.0.0.1" // Force IPv4
    });
    try {
        await client.connect();
        console.log("Connected to database. Patching 'Club' table...");
        // Add missing columns if they don't exist
        await client.query(`
      ALTER TABLE "Club" 
      ADD COLUMN IF NOT EXISTS "password" TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS "permanentId" TEXT,
      ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS "rejectionRemark" TEXT;
    `);
        // Create unique index for permanentId if not exists
        await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Club_permanentId_key" ON "Club"("permanentId");
    `);
        console.log("Database patch successful!");
    }
    catch (err) {
        console.error("Failed to patch database:", err);
    }
    finally {
        await client.end();
    }
}
fix();
//# sourceMappingURL=fix-db.js.map