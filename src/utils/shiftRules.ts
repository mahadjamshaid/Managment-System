export type ShiftTimingInput = {
  startTime: string;
  endTime: string;
};

export type ShiftTimingResult = {
  startMinutes: number;
  endMinutes: number;
  normalizedEndMinutes: number;
  durationMinutes: number;
  isOvernight: boolean;
};

export type ShiftTimingValidation = {
  valid: boolean;
  result?: ShiftTimingResult;
  errors: Array<{ path: keyof ShiftTimingInput | "duration"; message: string }>;
};

export const MIN_SHIFT_DURATION_MINUTES = 4 * 60; // 4 hours
export const MAX_SHIFT_DURATION_MINUTES = 16 * 60; // 16 hours

export const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (value: number) => {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const analyzeShiftTiming = (input: ShiftTimingInput): ShiftTimingValidation => {
  const errors: ShiftTimingValidation["errors"] = [];
  const startMinutes = timeToMinutes(input.startTime);
  const endMinutes = timeToMinutes(input.endTime);

  if (startMinutes === endMinutes) {
    errors.push({
      path: "endTime",
      message: "Shift end time must be different from start time",
    });
  }

  const isOvernight = endMinutes < startMinutes;
  const normalizedEndMinutes = isOvernight ? endMinutes + 1440 : endMinutes;
  const durationMinutes = normalizedEndMinutes - startMinutes;

  if (durationMinutes < MIN_SHIFT_DURATION_MINUTES) {
    errors.push({
      path: "duration",
      message: `Shift duration must be at least ${MIN_SHIFT_DURATION_MINUTES / 60} hours`,
    });
  }

  if (durationMinutes > MAX_SHIFT_DURATION_MINUTES) {
    errors.push({
      path: "duration",
      message: `Shift duration cannot exceed ${MAX_SHIFT_DURATION_MINUTES / 60} hours`,
    });
  }

  const result: ShiftTimingResult = {
    startMinutes,
    endMinutes,
    normalizedEndMinutes,
    durationMinutes,
    isOvernight,
  };

  return {
    valid: errors.length === 0,
    result,
    errors,
  };
};
