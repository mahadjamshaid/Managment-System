import { eq, InferSelectModel } from "drizzle-orm";
import { shift } from "../schema";

export type ShiftRow = InferSelectModel<typeof shift>;

export const shiftRepo = {
  async insertShift(data: any, tx: any): Promise<ShiftRow> {
    const rows = await tx.insert(shift).values(data).returning();
    return rows[0];
  },

  async updateShiftById(id: number, data: any, tx: any): Promise<ShiftRow | null> {
    const rows = await tx
      .update(shift)
      .set(data)
      .where(eq(shift.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async findShiftById(id: number, tx: any): Promise<ShiftRow | null> {
    const rows = await tx
      .select()
      .from(shift)
      .where(eq(shift.id, id))
      .limit(1);
    return rows[0] ?? null;
  }
};
