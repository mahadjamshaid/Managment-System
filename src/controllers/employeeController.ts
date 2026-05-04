import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { db } from "../db";
import { employees } from "../db/schema";
import { eq, count, ilike, or, and, not } from "drizzle-orm";
import { paginationSchema } from "../schemas/paginationSchema";
import { postgresError } from "../types/types";

export const createEmployee = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  try {
    // Check if employee with this email already exists
    const [existingEmployee] = await db.select().from(employees).where(eq(employees.email, email)).limit(1);

    if (existingEmployee) {
      return res.status(400).json({ error: "Employee with this email already exists" });
    }

    const { password, ...employeeData } = req.body;

    let hashedPassword = undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const [newEmployee] = await db.insert(employees).values({
      ...employeeData,
      password: hashedPassword,
    }).returning();

    res.status(201).json(newEmployee);
  } catch (error) {
    next(error);
  }
};

export const getAllEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = paginationSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query parameters" })
    }

    const { page, limit, search } = parsed.data

    // Step 7 logic: Prevent invalid values and huge limits
    const safePage = Math.max(1, Number(page));
    const safeLimit = Math.min(50, Number(limit));
    const offset = (safePage - 1) * safeLimit;

    const searchTerm = search?.trim();

    const whereClause = searchTerm
      ? or(
        ilike(employees.name, `%${searchTerm}%`),
        ilike(employees.email, `%${searchTerm}%`)
      )
      : undefined;

    // Fetch data with limit, offset and whereClause
    const data = await db.select()
      .from(employees)
      .where(whereClause)
      .limit(safeLimit)
      .offset(offset);

    // Step 5 logic: Fetch total count with whereClause
    const totalResult = await db.select({ count: count() })
      .from(employees)
      .where(whereClause);

    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / safeLimit);

    res.json({
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      data
    });
  } catch (error) {

    next(error);
  }
};

export const getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  try {
    const employee = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    if (!employee.length) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee[0]);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  const { email } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    // If email is being updated, check if it's already in use by another employee
    if (email) {
      const [existingEmployee] = await db
        .select()
        .from(employees)
        .where(and(eq(employees.email, email), not(eq(employees.id, id))))
        .limit(1);

      if (existingEmployee) {
        return res.status(400).json({ error: "Email already in use by another employee" });
      }
    }

    const { password, ...updateData } = req.body;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedEmployee = await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, id))
      .returning();

    if (!updatedEmployee.length) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(updatedEmployee[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  try {
    const updatedEmployee = await db
      .update(employees)
      .set({ status: "inactive" })
      .where(eq(employees.id, id))
      .returning();

    if (!updatedEmployee.length) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ message: "Employee marked as inactive (soft deleted)", data: updatedEmployee[0] });
  } catch (error) {
    next(error);
  }
};
