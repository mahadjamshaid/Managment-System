import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email address"),
  role: z.string().min(2, "Role must be at least 2 characters"),
  departmentId: z.coerce.number().int("Department ID must be an integer").positive("Department is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  role: z.string().min(2).optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  password: z.string().min(6).optional(),
});

