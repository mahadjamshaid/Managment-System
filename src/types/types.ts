import { InferSelectModel } from "drizzle-orm";
import { admins, employees } from "../db/schema.js";
import { updateAttendanceSchema } from "../schemas/updateAttendance.schema.js";
import { z } from "zod";

export interface JwtPayload {
  id: number;
  email: string;
  username: string;
  role: string;
}

export type TUpdateAttendanceSchema = z.infer<typeof updateAttendanceSchema>

export type Admin = InferSelectModel<typeof admins>;
export type Employee = InferSelectModel<typeof employees>;

export type postgresError = {
  code?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}