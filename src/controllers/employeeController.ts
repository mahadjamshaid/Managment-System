import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { employees } from "../db/schema";
import { eq } from "drizzle-orm";

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
    const allEmployees = await db.select().from(employees);
    res.json(allEmployees);
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
