import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env");
}

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log("🚀 Running migrations...");
  
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log(" Migrations applied successfully!");
  } catch (error) {
    console.error(" Migration failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
