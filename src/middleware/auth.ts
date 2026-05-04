import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { JwtPayload } from "../types/types";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables");
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === "object" && decoded !== null && "id" in decoded) {
      req.user = decoded as unknown as JwtPayload;
      next();
    } else {
      res.status(403).json({ success: false, message: "Invalid token structure." });
    }
  } catch (err) {
    res.status(403).json({ success: false, message: "Invalid or expired token." });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Insufficient permissions." });
    }

    next();
  };
};
