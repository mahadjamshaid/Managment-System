import { z } from "zod";

export const checkInSchema = z.object({
  employeeId: z.number(),
  status: z.enum(["Present", "Absent", "Late"]),
});

export const checkOutSchema = z.object({
  employeeId: z.number(),
});
