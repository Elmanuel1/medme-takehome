/**
 * Date utility functions for the MedMe scheduling service
 */

/**
 * Get the current time in UTC
 * @returns Date object representing the current UTC time
 */
export function getCurrentTimeUTC(): Date {
  return new Date();
}

/**
 * Get the current time in UTC as an ISO string
 * @returns ISO string representation of the current UTC time
 */
export function getCurrentTimeUTCString(): string {
  return new Date().toISOString();
}

/**
 * Get the current time in UTC with milliseconds set to 0
 * @returns Date object representing the current UTC time with seconds precision
 */
export function getCurrentTimeUTCSeconds(): Date {
  const now = new Date();
  now.setMilliseconds(0);
  return now;
}

/**
 * Get the current time in UTC with minutes and seconds set to 0
 * @returns Date object representing the current UTC time with hour precision
 */
export function getCurrentTimeUTCHours(): Date {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now;
}

/**
 * Convert a date to UTC if it's in local time
 * @param date - The date to convert
 * @returns Date object in UTC
 */
export function toUTC(date: Date): Date {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
}

/**
 * Check if a date is in the past (compared to current UTC time)
 * @param date - The date to check
 * @returns True if the date is in the past
 */
export function isInPast(date: Date): boolean {
  return date < getCurrentTimeUTC();
}

/**
 * Check if a date is in the future (compared to current UTC time)
 * @param date - The date to check
 * @returns True if the date is in the future
 */
export function isInFuture(date: Date): boolean {
  return date > getCurrentTimeUTC();
}

/**
 * Add hours to the current UTC time
 * @param hours - Number of hours to add
 * @returns Date object representing the current UTC time plus the specified hours
 */
export function getCurrentTimeUTCPlusHours(hours: number): Date {
  const now = getCurrentTimeUTC();
  now.setHours(now.getHours() + hours);
  return now;
}

/**
 * Add minutes to the current UTC time
 * @param minutes - Number of minutes to add
 * @returns Date object representing the current UTC time plus the specified minutes
 */
export function getCurrentTimeUTCPlusMinutes(minutes: number): Date {
  const now = getCurrentTimeUTC();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
}

/**
 * Get the start of the current day in UTC
 * @returns Date object representing midnight of the current day in UTC
 */
export function getCurrentDayStartUTC(): Date {
  const now = getCurrentTimeUTC();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Get the end of the current day in UTC
 * @returns Date object representing 23:59:59.999 of the current day in UTC
 */
export function getCurrentDayEndUTC(): Date {
  const now = getCurrentTimeUTC();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
}
