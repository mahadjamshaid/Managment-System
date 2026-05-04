export const normalizeName = (value: string) => value.trim().toLowerCase();
export const formatDepartmentName = (value: string) => value.trim().toUpperCase();
export const buildShiftName = (departmentName: string) => `${formatDepartmentName(departmentName)} SHIFT`;