import { db } from "../db";
import { admins, employees } from "../db/schema";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";

export const findUserByEmail = async (email: string) => {
  // Check admins first
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);
  if (admin) return { user: admin, type: "admin" as const };

  // Check employees
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.email, email))
    .limit(1);
  if (employee) return { user: employee, type: "employee" as const };

  return null;
};

export const generateResetToken = async (email: string) => {
  const result = await findUserByEmail(email);
  if (!result) return null;

  const { user, type } = result;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiry = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

  const table = type === "admin" ? admins : employees;

  await db
    .update(table)
    .set({
      resetToken: hashedToken,
      resetTokenExpiry: expiry,
    })
    .where(eq(table.id, user.id));

  return rawToken;
};

export const findUserByResetToken = async (rawToken: string) => {
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Search admins
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.resetToken, hashedToken))
    .limit(1);
  if (admin) return { user: admin, type: "admin" as const };

  // Search employees
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.resetToken, hashedToken))
    .limit(1);
  if (employee) return { user: employee, type: "employee" as const };

  return null;
};

export const resetUserPassword = async (rawToken: string, newPassword: string) => {
  const result = await findUserByResetToken(rawToken);

  if (!result) {
    throw new Error("Invalid token");
  }

  const { user, type } = result;

  if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new Error("Token expired");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const table = type === "admin" ? admins : employees;

  await db
    .update(table)
    .set({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    })
    .where(eq(table.id, user.id));

  return true;
};
