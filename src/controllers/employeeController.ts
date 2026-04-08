import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { employees } from "../db/schema";
import { eq, count, ilike, or } from "drizzle-orm";
import { paginationSchema } from "../schemas/paginationSchema";

export const createEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newEmployee = await db.insert(employees).values(req.body).returning();
    res.status(201).json(newEmployee[0]);
  } catch (error) {
    console.error("Error creating employee:", error);
    next(error);
  }
};

export const getAllEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = paginationSchema.parse(req.query);
    
    // Step 7 logic: Prevent invalid values and huge limits
    const page = Math.max(1, Number(parsed.page));
    const limit = Math.min(50, Number(parsed.limit));
    const offset = (page - 1) * limit;

    const searchTerm = parsed.search?.trim();

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
      .limit(limit)
      .offset(offset);

    // Step 5 logic: Fetch total count with whereClause
    const totalResult = await db.select({ count: count() })
      .from(employees)
      .where(whereClause);
    
    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / limit);

    res.json({
      page,
      limit,
      total,
      totalPages,
      data
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
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
    console.error("Error fetching employee by ID:", error);
    next(error);
  }
};

export const updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  try {
    const updatedEmployee = await db
      .update(employees)
      .set(req.body)
      .where(eq(employees.id, id))
      .returning();
    if (!updatedEmployee.length) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(updatedEmployee[0]);
  } catch (error) {
    console.error("Error updating employee:", error);
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
    console.error("Error deleting employee:", error);
    next(error);
  }
};
