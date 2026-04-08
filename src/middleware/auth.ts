import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { JwtPayload } from "../types";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_very_secret_key_here";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (typeof decoded === "object" && decoded !== null && "id" in decoded) {
      req.user = decoded as unknown as JwtPayload;
      next();
    } else {
      res.status(403).json({ error: "Invalid token structure." });
    }
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired token." });
  }
};
