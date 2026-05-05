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
      success: true,
      message: "Login successful",
      data: {
        token,
        role: role
      }
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
      success: true,
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
    res.json({ 
      success: true,
      message: "Password reset successful" 
    });
  } catch (error: any) {
    if (error.message === "Invalid token" || error.message === "Token expired") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const signup = async (req: Request, res: Response) => {
  // Logic to allow employees to create accounts themselves for now.
  // We'll keep the restriction logic commented out for future use.
  /*
  return res.status(403).json({
    error: "Employee accounts must be created by an admin with a department assignment",
  });
  */

  const { name, username, email, password, departmentId, role } = req.body;

  // Frontend uses 'username', backend schema uses 'name'
  const displayName = name || username;

  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "Missing required fields: name/username, email, password" });
  }

  try {
    // Check if user already exists
    const [existingAdmin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    const [existingEmployee] = await db.select().from(employees).where(eq(employees.email, email)).limit(1);

    if (existingAdmin || existingEmployee) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // For now, we'll use departmentId 1 as a fallback if not provided
    // This allows self-signup to work even if the frontend hasn't been updated yet
    let finalDepartmentId = departmentId ? Number(departmentId) : 1;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newEmployee] = await db.insert(employees).values({
      name: displayName,
      email,
      password: hashedPassword,
      departmentId: finalDepartmentId,
      role: role || "employee",
      status: "active",
    }).returning();

    // After signup, we automatically log them in by providing a token
    const token = jwt.sign(
      {
        id: newEmployee.id,
        email: newEmployee.email,
        username: newEmployee.name,
        role: "employee"
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      success: true,
      message: "Employee account created successfully",
      data: {
        token,
        role: "employee",
        user: {
          id: newEmployee.id,
          name: newEmployee.name,
          email: newEmployee.email
        }
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
