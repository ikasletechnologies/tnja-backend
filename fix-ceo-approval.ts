import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

async function fix() {
  const connectionString = process.env.DATABASE_URL?.replace("localhost", "127.0.0.1");
  if (!connectionString) {
    console.error("DATABASE_URL not found");
    return;
  }

  const client = new pg.Client({
    connectionString,
    host: "127.0.0.1",
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    // Show how many records are affected before fixing
    const before = await client.query(`
      SELECT COUNT(*) FROM "Tournament"
      WHERE "ceoApproval" = 'APPROVED'
      AND "status" = 'PENDING'
    `);
    console.log(`Found ${before.rows[0].count} tournament(s) with incorrectly auto-set ceoApproval.`);

    // Fix: set ceoApproval = NOT_REQUIRED for tournaments that are still PENDING overall
    // (status = PENDING means no one explicitly approved them via the approve endpoint)
    const result = await client.query(`
      UPDATE "Tournament"
      SET "ceoApproval" = 'NOT_REQUIRED'
      WHERE "ceoApproval" = 'APPROVED'
      AND "status" = 'PENDING'
    `);
    console.log(`Fixed ${result.rowCount} tournament(s). ceoApproval set to NOT_REQUIRED.`);

    // Verify
    const after = await client.query(`
      SELECT COUNT(*) FROM "Tournament"
      WHERE "ceoApproval" = 'APPROVED'
      AND "status" = 'PENDING'
    `);
    console.log(`Remaining incorrect records: ${after.rows[0].count}`);

  } catch (err) {
    console.error("Fix failed:", err);
  } finally {
    await client.end();
  }
}

fix();
