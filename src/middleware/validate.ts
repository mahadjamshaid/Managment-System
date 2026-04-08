import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError, ZodIssue } from "zod";

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  try {
    schema.parse(req.body);
    next();
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: "error",
        message: "Validation failed",
        details: error.issues.map((e: ZodIssue) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }
    
    // Fallback for non-Zod errors
    next(error);
  }
};
