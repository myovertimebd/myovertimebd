/**
 * My Overtime BD - Central Salary Calculation Engine
 *
 * This module is intentionally independent of React and UI.
 * Existing application calculations are not changed in this step.
 */

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const nonNegative = (value) => Math.max(0, numberOrZero(value));

/**
 * Legacy Gazette 2023 calculation.
 * Preserves the existing Settings.js formula.
 * This is a software calculation preset, not legal verification.
 */
export function calculateGazette2023(grossSalary) {
  const gross = nonNegative(grossSalary);

  const medical = 750;
  const transport = 450;
  const food = 1250;

  const fixed = medical + transport + food;
  const core = Math.max(0, gross - fixed);

  const basic = Math.ceil(core / 1.5);
  const house = Math.round(core - basic);
  const hourlyRate = (basic / 208) * 2;

  return {
    mode: "gazette-2023",
    gross,
    basic,
    house,
    medical,
    transport,
    food,
    hourlyRate: Number(hourlyRate.toFixed(2)),
  };
}

/**
 * Flexible salary calculation.
 * User supplies the salary components and OT settings.
 */
export function calculateFlexibleSalary(input = {}) {
  const basic = nonNegative(input.basic);
  const house = nonNegative(input.house);
  const medical = nonNegative(input.medical);
  const transport = nonNegative(input.transport);
  const food = nonNegative(input.food);
  const otherAllowance = nonNegative(input.otherAllowance);

  const gross =
    basic + house + medical + transport + food + otherAllowance;

  const divisor = nonNegative(input.monthlyHours) || 208;
  const multiplier = nonNegative(input.otMultiplier) || 2;

  const hourlyRate =
    numberOrZero(input.manualHourlyRate) > 0
      ? numberOrZero(input.manualHourlyRate)
      : (basic / divisor) * multiplier;

  return {
    mode: "flexible",
    gross,
    basic,
    house,
    medical,
    transport,
    food,
    otherAllowance,
    monthlyHours: divisor,
    otMultiplier: multiplier,
    hourlyRate: Number(hourlyRate.toFixed(2)),
  };
}

/**
 * Common entry point for future UI integration.
 */
export function calculateSalaryBreakdown(input = {}) {
  if (input.mode === "gazette-2023") {
    return calculateGazette2023(input.gross);
  }

  if (input.mode === "flexible") {
    return calculateFlexibleSalary(input);
  }

  throw new Error("Unsupported salary calculation mode.");
}

/**
 * Round monetary calculation results to two decimal places.
 */
export function roundMoney(value) {
  const number = numberOrZero(value);
  return Number(number.toFixed(2));
}

/**
 * Calculate overtime earnings.
 * Hourly rate is rounded to two decimals before multiplication.
 */
export function calculateOvertimePay(hours, hourlyRate) {
  const overtimeHours = nonNegative(hours);
  const rate = roundMoney(nonNegative(hourlyRate));

  return {
    hours: overtimeHours,
    hourlyRate: rate,
    total: roundMoney(overtimeHours * rate),
  };
}
