import { pgTable, text, timestamp, date, varchar, integer, unique, time } from "drizzle-orm/pg-core";

export const shift = pgTable("shift", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  graceMinutes: integer("grace_minutes").notNull(),
  breakStartTime: time("break_start_time"),
  breakEndTime: time("break_end_time"),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
})

export const department = pgTable("department", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: varchar("description", { length: 255 }).notNull(),
  shiftId: integer("shift_id").references(() => shift.id).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),

})

export const employees = pgTable("employees", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 255 }).notNull(),
  departmentId: integer("department_id").references(() => department.id).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"), // 'active', 'inactive'
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
});

export const attendance = pgTable("attendance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  shiftId: integer("shift_id").references(() => shift.id).notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // 'Present', 'Absent', 'Late'
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
}, (table) => [
  unique("attendance_employee_date_idx").on(table.employeeId, table.date, table.shiftId)
]);

export const admins = pgTable("admins", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
});