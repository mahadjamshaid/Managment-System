import { z } from "zod";

export const employeeCheckInSchema = z.object({
  status: z.enum(["Present", "Late"]).optional(),
});

export const employeeCheckOutSchema = z.object({});