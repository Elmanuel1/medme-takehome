import { FastifyRequest, FastifyReply } from 'fastify';
import { IAppointmentService } from '../services/interfaces/IAppointmentService';
import { ICalendarService } from '../services/interfaces/ICalendarService';
import { withErrorHandling } from '../utils/errorHandler';
import { Retell } from 'retell-sdk';
import { ScheduleRequestSchema } from '../types/schedule';

/**
 * Service handlers for schedule operations.
 * These handlers are called by fastify-openapi-glue based on operationId in the OpenAPI spec.
 */
export class ScheduleHandlers {
  constructor(
    private appointmentService: IAppointmentService,
    private calendarService: ICalendarService
  ) {}

  // Helper function to clean appointment data before returning in responses
  private cleanAppointmentForResponse(appointment: any) {
    const cleaned = { ...appointment };
    
    // Remove notes completely from API responses - notes are for internal tool call logging only
    delete cleaned.notes;
    
    return cleaned;
  }

  /**
   * Handles Retell webhook requests for appointment scheduling.
   */
  handleRetellWebhook = withErrorHandling(async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const signature = request.headers['x-retell-signature'] as string;

    try {
         Retell.verify(
          JSON.stringify(body),
          process.env.RETELL_API_KEY!,
          signature
        );
      } catch (error) {
        console.error('❌ Signature verification failed:', error);
        reply.code(200).send({ success: false, code: 'INVALID_SIGNATURE', message: 'Invalid signature' });
        return;
      }

    const { name, call, args } = body;
    console.log(`📞 ${name}:`, args);

    // Handle different custom function names
    switch (name) {
      case 'schedule_appointment':
        return await this.handleScheduleAppointment(call, args, reply);
      case 'check_booked_slots':
        return await this.handleCheckBookedSlots(call, args, reply);
      case 'reschedule_appointment':
        return await this.handleRescheduleAppointment(call, args, reply);
      case 'cancel_appointment':
        return await this.handleCancelAppointment(call, args, reply);
      case 'get_active_appointments_by_email_or_phone':
        return await this.handleGetActiveAppointmentsByEmail(call, args, reply);
      case 'get_current_time':
        return await this.handleGetCurrentTime(call, args, reply);
      default:
        reply.code(200).send({ success: false, code: 'UNKNOWN_FUNCTION', message: `Unknown function: ${name}` });
        return;
    }
  });

  private async handleScheduleAppointment(call: any, args: any, reply: FastifyReply) {
    const { firstName, lastName, email, phoneNumber, startAt, endAt, type, notes, reason } = args;

    const parsed = ScheduleRequestSchema.safeParse({
      firstName,
      lastName,
      email,
      phoneNumber,
      startAt,
      endAt,
      type,
      notes: call,
      reason,
      callId: call?.call_id
    });

    if (!parsed.success) {
      reply.code(200).send({ success: false, code: 'VALIDATION_ERROR', message: 'Invalid request data', details: parsed.error.flatten() });
      return;
    }

    // Create appointment using the service
    const appointment = await this.appointmentService.createAppointment(parsed.data);

    reply.send({
      success: "true",
      message: `Appointment scheduled for ${parsed.data.firstName} ${parsed.data.lastName} (${parsed.data.email}) from ${parsed.data.startAt.toISOString()} to ${parsed.data.endAt.toISOString()}`,
      appointmentId: appointment.id
    });
  }

  private async handleCheckBookedSlots(call: any, args: any, reply: FastifyReply) {
    const { dateStr } = args;
    
    // Validate date string
    if (!dateStr || typeof dateStr !== 'string') {
      reply.code(200).send({ 
        success: false, 
        code: 'INVALID_DATE', 
        message: 'dateStr is required and must be a valid date string' 
      });
      return;
    }
    
    const date = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      reply.code(200).send({ 
        success: false, 
        code: 'INVALID_DATE', 
        message: `Invalid date string: ${dateStr}` 
      });
      return;
    }
    
    const bookedSlots = await this.calendarService.getBookedSlotsForDate(date);

    // Convert dateStr to UTC for comparison
    const checkTimeUTC = new Date(dateStr).toISOString();

    // Check if the dateStr time is among the booked slots using functional approach
    const available = !bookedSlots.some(slot => {
      const slotStart = new Date(slot.start).toISOString();
      const slotEnd = new Date(slot.end).toISOString();
      
      // Check if the dateStr time falls within any booked slot
      return checkTimeUTC >= slotStart && checkTimeUTC < slotEnd;
    });

    reply.send({
      success: "true",
      bookedSlots,
      available
    });
  }

  private async handleRescheduleAppointment(call: any, args: any, reply: FastifyReply) {
    const { appointmentId, startAt, endAt, type } = args;
    
    // Validate inputs
    if (!appointmentId) {
      reply.code(200).send({ 
        success: false, 
        code: 'MISSING_APPOINTMENT_ID', 
        message: 'appointmentId is required' 
      });
      return;
    }
    
    if (!startAt || !endAt) {
      reply.code(200).send({ 
        success: false, 
        code: 'MISSING_DATES', 
        message: 'startAt and endAt are required' 
      });
      return;
    }
    
    // Validate dates
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      reply.code(200).send({ 
        success: false, 
        code: 'INVALID_DATE', 
        message: 'startAt and endAt must be valid date strings' 
      });
      return;
    }

    // Prepare update data - only allow date/time and appointment type changes
    const updateData: any = {
      startAt: startDate,
      endAt: endDate
    };

    // Add type if provided
    if (type) {
      updateData.type = type;
    }

    // Update appointment using the service
    const updatedAppointment = await this.appointmentService.editAppointment(appointmentId, updateData);

    if (!updatedAppointment) {
      reply.code(200).send({
        success: false,
        code: 'APPOINTMENT_NOT_FOUND',
        message: `Appointment ${appointmentId} not found`
      });
      return;
    }

    const message = type 
      ? `Appointment ${appointmentId} rescheduled to ${startDate.toISOString()} - ${endDate.toISOString()} and changed to ${type}`
      : `Appointment ${appointmentId} rescheduled to ${startDate.toISOString()} - ${endDate.toISOString()}`;

    reply.send({
      success: "true",
      message: message
    });
  }

  private async handleCancelAppointment(call: any, args: any, reply: FastifyReply) {
    const { appointmentId } = args;
    
    // Validate appointmentId
    if (!appointmentId) {
      reply.code(200).send({ 
        success: false, 
        code: 'MISSING_APPOINTMENT_ID', 
        message: 'appointmentId is required' 
      });
      return;
    }

    // Cancel appointment using the service
    await this.appointmentService.cancelAppointment(appointmentId);

    reply.send({
      success: "true",
      message: `Appointment ${appointmentId} cancelled successfully`
    });
  }

  private async handleGetActiveAppointmentsByEmail(call: any, args: any, reply: FastifyReply) {
    const { emailOrPhone } = args;
    
    // Validate emailOrPhone
    if (!emailOrPhone || typeof emailOrPhone !== 'string' || emailOrPhone.trim().length === 0) {
      reply.code(200).send({ 
        success: false, 
        code: 'INVALID_INPUT', 
        message: 'emailOrPhone is required and must be a valid string' 
      });
      return;
    }
    
    const appointments = await this.appointmentService.getActiveAppointmentsByEmailOrPhone(emailOrPhone);
    const cleanedAppointments = appointments.map(apt => this.cleanAppointmentForResponse(apt));
    reply.send({ 
      success: "true", 
      appointments: cleanedAppointments,
      count: appointments.length,
      message: `Found ${appointments.length} active appointment(s) for ${emailOrPhone}`
    });
  }


  private async handleGetCurrentTime(call: any, args: any, reply: FastifyReply) {
    const currentTime = new Date();
    const timeString = currentTime.toISOString();
    const readableTime = currentTime.toLocaleString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    reply.send({
      success: "true",
      message: `The current time is ${readableTime}`,
      currentTime: {
        iso: timeString,
        readable: readableTime,
        timestamp: currentTime.getTime(),
        timezone: 'UTC'
      }
    });
  }
}
