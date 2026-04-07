import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email address"),
  role: z.string().min(2, "Role must be at least 2 characters"),
  department: z.string().min(2, "Department must be at least 2 characters"),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  role: z.string().min(2).optional(),
  department: z.string().min(2).optional(),
});
