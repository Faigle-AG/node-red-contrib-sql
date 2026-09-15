"use strict";

const MAX_TIMEOUT_MS = 2147483647;

function createError(message, code, cause) {
  const err = new Error(message);
  if (code) err.code = code;
  if (cause) err.cause = cause;
  return err;
}

function integerOption(value, fallback, minimum, maximum, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && value.trim() === "") ||
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw createError(
      `${label} must be an integer from ${minimum} to ${maximum}`,
      "INVALID_CONFIGURATION",
    );
  }
  return parsed;
}

module.exports = { MAX_TIMEOUT_MS, createError, integerOption };
