import { eq, asc, InferSelectModel } from "drizzle-orm";
import { department, shift } from "../schema.js";

export type DepartmentRow = InferSelectModel<typeof department>;
export type ShiftRow = InferSelectModel<typeof shift>;
export type DepartmentWithShift = DepartmentRow & { assignedShift: ShiftRow | null };

const departmentWithShiftSelect = {
  id: department.id,
  name: department.name,
  description: department.description,
  shiftId: department.shiftId,
  createdAt: department.createdAt,
  updatedAt: department.updatedAt,
  assignedShift: {
    id: shift.id,
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    graceMinutes: shift.graceMinutes,
    breakMinutes: shift.breakMinutes,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  },
};

export const departmentRepo = {
  findAllDepartmentsWithShift: (dbInstance: any): Promise<DepartmentWithShift[]> => {
    return dbInstance
      .select(departmentWithShiftSelect)
      .from(department)
      .leftJoin(shift, eq(department.shiftId, shift.id))
      .orderBy(asc(department.name));
  },

  async findDepartmentByIdBasic(id: number, tx: any): Promise<Pick<DepartmentRow, "id" | "shiftId"> | null> {
    const rows = await tx
      .select({ id: department.id, shiftId: department.shiftId })
      .from(department)
      .where(eq(department.id, id))
      .limit(1);

    return rows[0] ?? null;
  },

  async findDepartmentById(id: number, tx: any): Promise<Pick<DepartmentRow, "id" | "shiftId"> | null> {
    return this.findDepartmentByIdBasic(id, tx);
  },

  async findDepartmentByIdWithShift(id: number, tx: any): Promise<DepartmentWithShift | null> {
    const rows = await tx
      .select(departmentWithShiftSelect)
      .from(department)
      .leftJoin(shift, eq(department.shiftId, shift.id))
      .where(eq(department.id, id))
      .limit(1);

    return rows[0] ?? null;
  },

  async findDepartmentByName(name: string, tx: any): Promise<Pick<DepartmentRow, "id"> | null> {
    const rows = await tx
      .select({ id: department.id })
      .from(department)
      .where(eq(department.name, name))
      .limit(1);

    return rows[0] ?? null;
  },

  async insertDepartment(data: any, tx: any): Promise<DepartmentRow> {
    const rows = await tx.insert(department).values(data).returning();
    return rows[0];
  },

  async updateDepartmentById(id: number, data: any, tx: any): Promise<DepartmentRow> {
    const rows = await tx
      .update(department)
      .set(data)
      .where(eq(department.id, id))
      .returning();
    return rows[0];
  },
};