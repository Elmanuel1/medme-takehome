import { AppointmentEntity } from '../models/AppointmentEntity';
import { Appointment, ScheduleRequest, AppointmentStatus } from '../types/schedule';
import { IAppointmentRepository } from '../repositories/interfaces/IAppointmentRepository';
import { ICalendarService } from './interfaces/ICalendarService';
import { IAppointmentService } from './interfaces/IAppointmentService';
import { 
  NotFoundError, 
  AppointmentCancellationError,
  TimeSlotUnavailableError
} from '../types/errors';

export class AppointmentService implements IAppointmentService {
  private appointmentRepository: IAppointmentRepository;
  private calendarService: ICalendarService;

  constructor(
    appointmentRepository: IAppointmentRepository,
    calendarService: ICalendarService
  ) {
    this.appointmentRepository = appointmentRepository;
    this.calendarService = calendarService;
  }

  async getActiveAppointmentsByEmailOrPhone(emailOrPhone: string): Promise<AppointmentEntity[]> {
    return await this.appointmentRepository.getActiveAppointmentsByEmailOrPhone(emailOrPhone);
  }

  async createAppointment(data: ScheduleRequest): Promise<AppointmentEntity> {
    // Check for time slot conflicts and get conflicting appointments
    const conflictingAppointments = await this.appointmentRepository.getConflictingAppointments(data.startAt, data.endAt);
    if (conflictingAppointments.length > 0) {
      // Check if any conflicting appointment is by the same person (email or phone)
      const samePersonConflict = conflictingAppointments.find(apt => 
        (data.email && apt.email === data.email) || 
        (data.phoneNumber && apt.phoneNumber === data.phoneNumber)
      );

      if (samePersonConflict) {
        throw new TimeSlotUnavailableError(
          `You already have an appointment scheduled during this time slot from ${data.startAt.toISOString()} to ${data.endAt.toISOString()}`
        );
      } else {
        throw new TimeSlotUnavailableError(
          `Time slot from ${data.startAt.toISOString()} to ${data.endAt.toISOString()} is already booked`
        );
      }
    }

    // Create appointment entity from ScheduleRequest
    const appointment = new AppointmentEntity(data);

    // Create appointment in database first
    const createdAppointment = await this.appointmentRepository.create(appointment);

    try {
      // Create calendar event - ensure we have a required id
      const appointmentForCalendar: Appointment = {
        ...createdAppointment,
        id: createdAppointment.id!,
        createdAt: createdAppointment.createdAt!,
        updatedAt: createdAppointment.updatedAt
      };
      
      const eventId = await this.calendarService.createCalendarEvent(appointmentForCalendar);
      
      // Update appointment with calendar event ID
      createdAppointment.setCalendarEventId(eventId);
      const updatedAppointment = await this.appointmentRepository.update(createdAppointment.id!, createdAppointment);
      
      return updatedAppointment;
    } catch (calendarError) {
      // Rollback: Delete the created appointment if calendar booking fails
      try {
        await this.appointmentRepository.delete(createdAppointment.id!);
      } catch (deleteError) {
        console.error('Failed to rollback appointment creation for details:', deleteError);
      }
      
      throw new Error(`Failed to create calendar event: ${calendarError instanceof Error ? calendarError.message : 'Unknown error'}`);
    }
  }

  async editAppointment(appointmentId: string, data: Partial<ScheduleRequest>): Promise<AppointmentEntity | null> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment with ID ${appointmentId} not found`);
    }

    // If appointment time is being updated, check for conflicts
    if (data.startAt && data.endAt) {
      const conflictingAppointments = await this.appointmentRepository.getConflictingAppointments(data.startAt, data.endAt, appointmentId);
      if (conflictingAppointments.length > 0) {
        // Check if any conflicting appointment is by the same person (email or phone)
        const samePersonConflict = conflictingAppointments.find(apt => 
          (appointment.email && apt.email === appointment.email) || 
          (appointment.phoneNumber && apt.phoneNumber === appointment.phoneNumber)
        );

        if (samePersonConflict) {
          throw new TimeSlotUnavailableError(
            `You already have another appointment scheduled during this time slot from ${data.startAt.toISOString()} to ${data.endAt.toISOString()}`
          );
        } else {
          throw new TimeSlotUnavailableError(
            `Time slot conflict: The new time slot is already booked.`
          );
        }
      }
    }

    // Only allow specific fields to be updated (date/time and appointment type)
    const allowedUpdates: Partial<Appointment> = {};
    
    // Allow date/time updates
    if (data.startAt !== undefined) allowedUpdates.startAt = data.startAt;
    if (data.endAt !== undefined) allowedUpdates.endAt = data.endAt;
    
    // Allow appointment type updates
    if (data.type !== undefined) allowedUpdates.type = data.type;

    // Update appointment data with only allowed fields
    const updatedAppointmentData: Appointment = {
      ...appointment,
      ...allowedUpdates,
      id: appointment.id!,
      createdAt: appointment.createdAt!,
      updatedAt: new Date()
    };

    const updatedAppointment = new AppointmentEntity(updatedAppointmentData);
    
    // Update in database
    const dbResult = await this.appointmentRepository.update(appointmentId, updatedAppointment);

    // Update calendar event if calendar event ID exists
    if (appointment.calendarEventId) {
      try {
        const appointmentForCalendar: Appointment = {
          ...dbResult,
          id: dbResult.id!,
          createdAt: dbResult.createdAt!,
          updatedAt: dbResult.updatedAt
        };
        await this.calendarService.updateCalendarEvent(appointment.calendarEventId, appointmentForCalendar);
      } catch (calendarError) {
        console.error('Failed to update calendar event:', calendarError);
        // Note: We don't rollback the DB update here as it's a secondary operation
        // We can implement a queue to retry the operation later
      }
    }

    return dbResult;
  }

  async cancelAppointment(appointmentId: string): Promise<boolean> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment with ID ${appointmentId} not found`);
    }

    // Check if appointment can be cancelled (business rules)
    this.validateAppointmentCanBeCancelled(appointment);

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.updatedAt = new Date();
    
    // Update in database
    await this.appointmentRepository.update(appointmentId, appointment);

    // Cancel calendar event if calendar event ID exists
    if (appointment.calendarEventId) {
      try {
        await this.calendarService.deleteCalendarEvent(appointment.calendarEventId);
      } catch (calendarError) {
        console.error('Failed to delete calendar event:', calendarError);
        // Note: We don't rollback the DB update here as the appointment is already cancelled
      }
    }

    return true;
  }

  private validateAppointmentCanBeCancelled(appointment: AppointmentEntity): void {
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new AppointmentCancellationError('Appointment is already cancelled');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new AppointmentCancellationError('Cannot cancel completed appointments');
    }

    const appointmentDateTime = appointment.startAt;
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 2) {
      console.log(`⏰ Cancellation blocked: Appointment at ${appointmentDateTime.toISOString()}, Current time: ${now.toISOString()}, Hours until: ${hoursUntilAppointment.toFixed(2)}`);
      throw new AppointmentCancellationError('Cannot cancel appointments less than 2 hours before start time');
    }
  }
}