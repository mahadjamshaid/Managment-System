import { z } from "zod";

export const checkInSchema = z.object({
  employeeId: z.number(),
  checkInTime: z.string().optional(),
  status: z.enum(["Present", "Late", "Absent", "OnLeave"]).optional(),
});

export const checkOutSchema = z.object({
  employeeId: z.number(),
  checkOutTime: z.string().optional(),
});

export const employeeCheckInSchema = z.object({
  status: z.enum(["Present", "Late"]).optional(),
});

export const employeeCheckOutSchema = z.object({});