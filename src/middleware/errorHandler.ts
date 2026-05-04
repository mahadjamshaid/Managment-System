import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError.js";

export const errorHandler = (
  err: unknown, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  console.error("Unhandled Error: ", err);

  if (err instanceof ApiError){
    return res.status(err.status).json({
      success: false,
      message: err.message,
      code: err.code
    })
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};
