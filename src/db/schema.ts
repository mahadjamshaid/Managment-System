import { pgTable, text, timestamp, date, varchar, integer } from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
});

export const employees = pgTable("employees", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"), // 'active', 'inactive'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // 'Present', 'Absent', 'Late'
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
});
