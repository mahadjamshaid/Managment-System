import { db } from "./index";
import { admins } from "./schema";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const seed = async () => {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error("ADMIN_USERNAME or ADMIN_PASSWORD not set in .env");
    process.exit(1);
  }

  console.log("Seeding admin user...");

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.insert(admins).values({
      username,
      password: hashedPassword,
    }).onConflictDoNothing();

    console.log("Admin user seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seed();
