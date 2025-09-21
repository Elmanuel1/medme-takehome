export class AppError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT_ERROR', message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class AppointmentCancellationError extends AppError {
  constructor(message: string) {
    super('APPOINTMENT_CANCELLATION_ERROR', message);
    Object.setPrototypeOf(this, AppointmentCancellationError.prototype);
  }
}

export class AppointmentReschedulingError extends AppError {
  constructor(message: string) {
    super('APPOINTMENT_RESCHEDULING_ERROR', message);
    Object.setPrototypeOf(this, AppointmentReschedulingError.prototype);
  }
}

export class TimeSlotUnavailableError extends AppError {
  constructor(message: string) {
    super('TIME_SLOT_UNAVAILABLE', message);
    Object.setPrototypeOf(this, TimeSlotUnavailableError.prototype);
  }
}

export class PastDateError extends AppError {
  constructor(message: string) {
    super('PAST_DATE_ERROR', message);
    Object.setPrototypeOf(this, PastDateError.prototype);
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingAppointments: any[];
}
