import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { db } from "./index.js";
import { admins } from "./schema.js";

dotenv.config();

const seed = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("ADMIN_EMAIL or ADMIN_PASSWORD not set in .env");
    process.exit(1);
  }

  const username = process.env.ADMIN_USERNAME || email.split("@")[0] || "admin";

  console.log(`Seeding admin user: ${username} (${email})...`);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.insert(admins).values({
      username,
      email,
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
