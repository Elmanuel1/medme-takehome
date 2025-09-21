import { FastifyReply } from 'fastify';
import { 
  ValidationError, 
  ConflictError, 
  NotFoundError, 
  AppointmentCancellationError,
  TimeSlotUnavailableError,
  PastDateError 
} from '../types/errors';

/**
 * Centralized error handler for API operations.
 * Always returns HTTP 200 with structured response containing success: false and error code.
 * 
 * @param error - The error to handle
 * @param reply - Fastify reply object
 * @returns true if error was handled, false if it should be re-thrown
 */
export function handleApiError(error: unknown, reply: FastifyReply): boolean {
  if (error instanceof ValidationError) {
    reply.code(200).send({ success: false, code: error.code, message: error.message });
    return true;
  }
  
  if (error instanceof ConflictError) {
    reply.code(200).send({ success: false, code: error.code, message: error.message });
    return true;
  }
  
  if (error instanceof NotFoundError) {
    reply.code(200).send({ success: false, code: error.code, message: error.message });
    return true;
  }
  
  if (error instanceof AppointmentCancellationError) {
    reply.code(200).send({ success: false, code: error.code, message: error.message });
    return true;
  }
  
  if (error instanceof TimeSlotUnavailableError) {
    reply.code(200).send({ success: false, code: error.code, message: error.message });
    return true;
  }
  
  if (error instanceof PastDateError) {
    reply.code(200).send({ success: false, code: error.code, message: error.message });
    return true;
  }
  
  // Error not handled, should be re-thrown
  return false;
}

/**
 * Wrapper function to handle errors in async handler methods.
 * Use this to wrap handler logic and automatically handle known errors.
 * 
 * @param handlerFn - The async handler function to wrap
 * @returns Wrapped handler function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  handlerFn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | void> => {
    const reply = args[args.length - 1] as FastifyReply;
    
    try {
      return await handlerFn(...args);
    } catch (error) {
      if (handleApiError(error, reply)) {
        return;
      }
      throw error;
    }
  };
}
