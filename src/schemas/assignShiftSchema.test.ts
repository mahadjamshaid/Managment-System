import test from "node:test";
import assert from "node:assert/strict";
import {
  assignShiftBodySchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from "./assignShiftSchema";

test("createDepartmentSchema accepts an overnight department shift", () => {
  const result = createDepartmentSchema.safeParse({
    name: "Support",
    description: "Night support",
    startTime: "22:00",
    endTime: "06:00",
    graceMinutes: "15",
    breakStartTime: "01:00",
    breakEndTime: "01:30",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.graceMinutes, 15);
  }
});

test("createDepartmentSchema rejects invalid shift windows", () => {
  const result = createDepartmentSchema.safeParse({
    name: "Support",
    description: "Night support",
    startTime: "09:00",
    endTime: "09:00",
    graceMinutes: 15,
  });

  assert.equal(result.success, false);
});

test("assignShiftBodySchema rejects break timing outside shift", () => {
  const result = assignShiftBodySchema.safeParse({
    startTime: "09:00",
    endTime: "17:00",
    graceMinutes: 15,
    breakStartTime: "18:00",
    breakEndTime: "18:30",
  });

  assert.equal(result.success, false);
});

test("updateDepartmentSchema requires at least one field", () => {
  const result = updateDepartmentSchema.safeParse({});

  assert.equal(result.success, false);
});

test("updateDepartmentSchema accepts a name-only update", () => {
  const result = updateDepartmentSchema.safeParse({ name: "Human Resources" });

  assert.equal(result.success, true);
});