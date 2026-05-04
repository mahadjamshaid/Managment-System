import { DepartmentRow, ShiftRow } from "../db/repositories/departmentRepo";
import { formatDepartmentName } from "../utils/departmentUtils";
import { analyzeShiftTiming } from "../utils/shiftRules";

const toShiftResponse = (shift: ShiftRow | null) => {
  if (!shift) return null;

  const analysis = analyzeShiftTiming({
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakStartTime: shift.breakStartTime,
    breakEndTime: shift.breakEndTime,
  });

  return {
    ...shift,
    name: formatDepartmentName(shift.name),
    isOvernight: analysis.result?.isOvernight ?? false,
    durationMinutes: analysis.result?.durationMinutes ?? 0,
  };
};

export const toDepartmentResponse = (
  department: DepartmentRow,
  shift: ShiftRow | null
) => {
  return {
    id: department.id,
    name: formatDepartmentName(department.name),
    description: department.description,
    shiftId: department.shiftId,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
    assignedShift: toShiftResponse(shift),
  };
};