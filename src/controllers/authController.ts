import { Request, Response } from "express";
import { db } from "../db/index.js";
import { admins, employees } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import { Admin, Employee } from "../types/types.js";
import * as authService from "../services/authService.js";
import { sendEmail } from "../utils/sendgrid.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables");
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // 1. Check admins table
    const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);

    let userData: Admin | Employee = admin;
    let role = "admin";

    // 2. If not found in admins, check employees table
    if (!userData) {
      const [employee] = await db.select().from(employees).where(eq(employees.email, email)).limit(1);
      userData = employee;
      role = "employee";
    }

    if (!userData) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if password exists (employees might not have it yet)
    if (!userData.password) {
      return res.status(401).json({ error: "Account not set up. Please contact admin." });
    }

    const isPasswordValid = await bcrypt.compare(password, userData.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: userData.id,
        email: userData.email,
        username: (userData as Admin).username || (userData as Employee).name,
        role: role
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      role: role
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const token = await authService.generateResetToken(email);

    if (token) {
      const frontendUrl = process.env.FRONTEND_URL;

      if (!frontendUrl) {
        console.error("FRONTEND_URL is not defined in .env");
        return res.status(500).json({ error: "Server configuration error" });
      }

      const resetLink = `${frontendUrl}/reset-password/${token}`;

      console.log(`Attempting to send reset email to: ${email}`);
      await sendEmail(
        email,
        "Password Reset Request",
        `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
        `
      );
    }

    res.json({
      message: "If email exists, reset link sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  try {
    await authService.resetUserPassword(token, newPassword);
    res.json({ message: "Password reset successful" });
  } catch (error: any) {
    if (error.message === "Invalid token" || error.message === "Token expired") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const signup = async (req: Request, res: Response) => {
  return res.status(403).json({
    error: "Employee accounts must be created by an admin with a department assignment",
  });
};
