export type ShiftTimingInput = {
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
};

export type ShiftTimingResult = {
  startMinutes: number;
  endMinutes: number;
  normalizedEndMinutes: number;
  durationMinutes: number;
  isOvernight: boolean;
  breakStartMinutes: number | null;
  breakEndMinutes: number | null;
};

export type ShiftTimingValidation = {
  valid: boolean;
  result?: ShiftTimingResult;
  errors: Array<{ path: keyof ShiftTimingInput | "duration"; message: string }>;
};

export const MIN_SHIFT_DURATION_MINUTES = 30;
export const MAX_SHIFT_DURATION_MINUTES = 16 * 60;

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

const normalizePointInsideShift = (
  pointMinutes: number,
  shiftStartMinutes: number,
  isOvernight: boolean
) => {
  if (isOvernight && pointMinutes < shiftStartMinutes) {
    return pointMinutes + 1440;
  }

  return pointMinutes;
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
      message: `Shift duration must be at least ${MIN_SHIFT_DURATION_MINUTES} minutes`,
    });
  }

  if (durationMinutes > MAX_SHIFT_DURATION_MINUTES) {
    errors.push({
      path: "duration",
      message: `Shift duration cannot exceed ${MAX_SHIFT_DURATION_MINUTES / 60} hours`,
    });
  }

  const hasBreakStart = Boolean(input.breakStartTime);
  const hasBreakEnd = Boolean(input.breakEndTime);

  if (hasBreakStart !== hasBreakEnd) {
    errors.push({
      path: "breakEndTime",
      message: "Provide both break start and break end times",
    });
  }

  let normalizedBreakStartMinutes: number | null = null;
  let normalizedBreakEndMinutes: number | null = null;

  if (hasBreakStart && hasBreakEnd && input.breakStartTime && input.breakEndTime) {
    const breakStartMinutes = timeToMinutes(input.breakStartTime);
    const breakEndMinutes = timeToMinutes(input.breakEndTime);

    normalizedBreakStartMinutes = normalizePointInsideShift(
      breakStartMinutes,
      startMinutes,
      isOvernight
    );
    normalizedBreakEndMinutes = normalizePointInsideShift(
      breakEndMinutes,
      startMinutes,
      isOvernight
    );

    if (isOvernight && normalizedBreakEndMinutes <= normalizedBreakStartMinutes) {
      normalizedBreakEndMinutes += 1440;
    }

    if (normalizedBreakStartMinutes === normalizedBreakEndMinutes) {
      errors.push({
        path: "breakEndTime",
        message: "Break end time must be different from break start time",
      });
    }

    if (normalizedBreakEndMinutes < normalizedBreakStartMinutes) {
      errors.push({
        path: "breakEndTime",
        message: "Break end time must be after break start time",
      });
    }

    if (
      normalizedBreakStartMinutes < startMinutes ||
      normalizedBreakEndMinutes > normalizedEndMinutes
    ) {
      errors.push({
        path: "breakStartTime",
        message: "Break timing must be inside the shift window",
      });
    }
  }

  const result: ShiftTimingResult = {
    startMinutes,
    endMinutes,
    normalizedEndMinutes,
    durationMinutes,
    isOvernight,
    breakStartMinutes: normalizedBreakStartMinutes,
    breakEndMinutes: normalizedBreakEndMinutes,
  };

  return {
    valid: errors.length === 0,
    result,
    errors,
  };
};
