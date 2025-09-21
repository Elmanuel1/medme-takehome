import { AppointmentService } from '../../services/appointmentService';
import { AppointmentEntity } from '../../models/AppointmentEntity';
import { AppointmentType, AppointmentStatus, ScheduleRequest } from '../../types/schedule';
import { IAppointmentRepository } from '../../repositories/interfaces/IAppointmentRepository';
import { ICalendarService } from '../../services/interfaces/ICalendarService';
import { 
  TimeSlotUnavailableError, 
  NotFoundError, 
  ConflictError, 
  AppointmentCancellationError 
} from '../../types/errors';

// Mock dependencies
const mockAppointmentRepository: jest.Mocked<IAppointmentRepository> = {
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  isAvailable: jest.fn(),
  getConflictingAppointments: jest.fn(),
  getActiveAppointmentsByEmailOrPhone: jest.fn()
};

const mockCalendarService: jest.Mocked<ICalendarService> = {
  getBookedSlotsForDate: jest.fn(),
  createCalendarEvent: jest.fn(),
  updateCalendarEvent: jest.fn(),
  deleteCalendarEvent: jest.fn()
};

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;
  let mockScheduleRequest: ScheduleRequest;
  let mockAppointmentEntity: AppointmentEntity;

  beforeEach(() => {
    appointmentService = new AppointmentService(mockAppointmentRepository, mockCalendarService);
    
    mockScheduleRequest = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+1234567890',
      startAt: new Date('2025-01-15T10:00:00Z'),
      endAt: new Date('2025-01-15T11:00:00Z'),
      type: AppointmentType.CONSULTATION,
      notes: { description: 'Regular checkup' },
      reason: 'Annual physical examination',
      callId: 'call-123'
    };

    mockAppointmentEntity = new AppointmentEntity({
      id: 'appt-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+1234567890',
      startAt: new Date('2025-01-15T10:00:00Z'),
      endAt: new Date('2025-01-15T11:00:00Z'),
      type: AppointmentType.CONSULTATION,
      notes: { description: 'Regular checkup' },
      reason: 'Annual physical examination',
      status: AppointmentStatus.SCHEDULED,
      calendarEventId: 'cal-event-123',
      createdAt: new Date('2025-01-10T09:00:00Z'),
      updatedAt: null
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createAppointment', () => {
    it('should create appointment successfully with calendar integration', async () => {
      const createdEntity = new AppointmentEntity({ ...mockAppointmentEntity, id: 'appt-123' });
      const updatedEntity = new AppointmentEntity({ ...mockAppointmentEntity, id: 'appt-123', calendarEventId: 'cal-event-456' });

      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([]);
      mockAppointmentRepository.create.mockResolvedValue(createdEntity);
      mockCalendarService.createCalendarEvent.mockResolvedValue('cal-event-456');
      mockAppointmentRepository.update.mockResolvedValue(updatedEntity);

      const result = await appointmentService.createAppointment(mockScheduleRequest);

      expect(mockAppointmentRepository.getConflictingAppointments).toHaveBeenCalledWith(
        mockScheduleRequest.startAt,
        mockScheduleRequest.endAt
      );
      expect(mockAppointmentRepository.create).toHaveBeenCalled();
      expect(mockCalendarService.createCalendarEvent).toHaveBeenCalled();
      expect(mockAppointmentRepository.update).toHaveBeenCalledWith('appt-123', expect.any(AppointmentEntity));
      expect(result.calendarEventId).toBe('cal-event-456');
    });

    it('should throw TimeSlotUnavailableError when slot is not available', async () => {
      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([mockAppointmentEntity]);

      await expect(appointmentService.createAppointment(mockScheduleRequest))
        .rejects.toThrow(TimeSlotUnavailableError);

      expect(mockAppointmentRepository.create).not.toHaveBeenCalled();
      expect(mockCalendarService.createCalendarEvent).not.toHaveBeenCalled();
    });

    it('should show personalized message when same person tries to book conflicting slot', async () => {
      // Create a conflicting appointment with same email
      const conflictingAppointment = new AppointmentEntity({
        ...mockAppointmentEntity,
        email: mockScheduleRequest.email, // Same email as new request
        id: 'conflict-appt-123'
      });
      
      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([conflictingAppointment]);

      await expect(appointmentService.createAppointment(mockScheduleRequest))
        .rejects.toThrow('You already have an appointment scheduled during this time slot');
    });

    it('should show generic message when different person tries to book conflicting slot', async () => {
      // Create a conflicting appointment with different email and phone
      const conflictingAppointment = new AppointmentEntity({
        ...mockAppointmentEntity,
        email: 'different@example.com', // Different email
        phoneNumber: '+9876543210', // Different phone
        id: 'conflict-appt-123'
      });
      
      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([conflictingAppointment]);

      await expect(appointmentService.createAppointment(mockScheduleRequest))
        .rejects.toThrow('Time slot from');
    });

    it('should accept appointment with only email (no phone number)', async () => {
      const requestWithEmailOnly = {
        ...mockScheduleRequest,
        phoneNumber: undefined
      };

      const createdEntity = new AppointmentEntity({ ...mockAppointmentEntity, id: 'appt-123' });
      const updatedEntity = new AppointmentEntity({ ...mockAppointmentEntity, id: 'appt-123', calendarEventId: 'cal-event-456' });

      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([]);
      mockAppointmentRepository.create.mockResolvedValue(createdEntity);
      mockCalendarService.createCalendarEvent.mockResolvedValue('cal-event-456');
      mockAppointmentRepository.update.mockResolvedValue(updatedEntity);

      const result = await appointmentService.createAppointment(requestWithEmailOnly);

      expect(result.calendarEventId).toBe('cal-event-456');
    });

    it('should accept appointment with only phone number (no email)', async () => {
      const requestWithPhoneOnly = {
        ...mockScheduleRequest,
        email: undefined,
        phoneNumber: '+1234567890'
      };

      const createdEntity = new AppointmentEntity({ ...mockAppointmentEntity, id: 'appt-123', email: undefined, phoneNumber: '+1234567890' });
      const updatedEntity = new AppointmentEntity({ ...mockAppointmentEntity, id: 'appt-123', email: undefined, phoneNumber: '+1234567890', calendarEventId: 'cal-event-456' });

      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([]);
      mockAppointmentRepository.create.mockResolvedValue(createdEntity);
      mockCalendarService.createCalendarEvent.mockResolvedValue('cal-event-456');
      mockAppointmentRepository.update.mockResolvedValue(updatedEntity);

      const result = await appointmentService.createAppointment(requestWithPhoneOnly);

      expect(result.calendarEventId).toBe('cal-event-456');
    });

    it('should rollback database creation if calendar creation fails', async () => {
      const createdEntity = new AppointmentEntity({ ...mockAppointmentEntity, id: 'appt-123' });

      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([]);
      mockAppointmentRepository.create.mockResolvedValue(createdEntity);
      mockCalendarService.createCalendarEvent.mockRejectedValue(new Error('Calendar API error'));
      mockAppointmentRepository.delete.mockResolvedValue(true);

      await expect(appointmentService.createAppointment(mockScheduleRequest))
        .rejects.toThrow('Failed to create calendar event');

      expect(mockAppointmentRepository.delete).toHaveBeenCalledWith('appt-123');
    });

    it('should handle rollback failure gracefully', async () => {
      const createdEntity = new AppointmentEntity({ ...mockAppointmentEntity, id: 'appt-123' });

      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([]);
      mockAppointmentRepository.create.mockResolvedValue(createdEntity);
      mockCalendarService.createCalendarEvent.mockRejectedValue(new Error('Calendar API error'));
      mockAppointmentRepository.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(appointmentService.createAppointment(mockScheduleRequest))
        .rejects.toThrow('Failed to create calendar event');

      expect(mockAppointmentRepository.delete).toHaveBeenCalledWith('appt-123');
    });
  });

  describe('editAppointment', () => {
    it('should update appointment successfully', async () => {
      const updateData = {
        startAt: new Date('2025-01-15T14:00:00Z'),
        endAt: new Date('2025-01-15T15:00:00Z')
      };
      const updatedEntity = new AppointmentEntity({ ...mockAppointmentEntity, ...updateData });

      mockAppointmentRepository.findById.mockResolvedValue(mockAppointmentEntity);
      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([]);
      mockAppointmentRepository.update.mockResolvedValue(updatedEntity);

      const result = await appointmentService.editAppointment('appt-123', updateData);

      expect(mockAppointmentRepository.findById).toHaveBeenCalledWith('appt-123');
      expect(mockAppointmentRepository.getConflictingAppointments).toHaveBeenCalledWith(
        updateData.startAt,
        updateData.endAt,
        'appt-123'
      );
      expect(mockAppointmentRepository.update).toHaveBeenCalled();
      expect(mockCalendarService.updateCalendarEvent).toHaveBeenCalled();
      expect(result).toEqual(updatedEntity);
    });

    it('should throw NotFoundError when appointment does not exist', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(null);

      await expect(appointmentService.editAppointment('appt-123', {}))
        .rejects.toThrow(NotFoundError);

      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw TimeSlotUnavailableError when new time slot is not available', async () => {
      const updateData = {
        startAt: new Date('2025-01-15T14:00:00Z'),
        endAt: new Date('2025-01-15T15:00:00Z')
      };

      mockAppointmentRepository.findById.mockResolvedValue(mockAppointmentEntity);
      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([mockAppointmentEntity]);

      await expect(appointmentService.editAppointment('appt-123', updateData))
        .rejects.toThrow(TimeSlotUnavailableError);

      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });

    it('should only update allowed fields (date/time and type)', async () => {
      const updateData = {
        startAt: new Date('2025-01-15T14:00:00Z'),
        endAt: new Date('2025-01-15T15:00:00Z'),
        type: AppointmentType.FOLLOW_UP,
        firstName: 'Hacker', // Should be ignored
        email: 'hacker@evil.com', // Should be ignored
        notes: { description: 'Malicious notes' } // Should be ignored
      };

      mockAppointmentRepository.findById.mockResolvedValue(mockAppointmentEntity);
      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([]);
      
      // Expect that only allowed fields are in the update
      const expectedUpdateData = {
        ...mockAppointmentEntity,
        startAt: updateData.startAt,
        endAt: updateData.endAt,
        type: updateData.type,
        // firstName, email, notes should remain unchanged
        firstName: mockAppointmentEntity.firstName,
        email: mockAppointmentEntity.email,
        notes: mockAppointmentEntity.notes,
        id: mockAppointmentEntity.id,
        createdAt: mockAppointmentEntity.createdAt,
        updatedAt: expect.any(Date)
      };

      const updatedEntity = new AppointmentEntity(expectedUpdateData);
      mockAppointmentRepository.update.mockResolvedValue(updatedEntity);

      const result = await appointmentService.editAppointment('appt-123', updateData);

      expect(result).toEqual(updatedEntity);
    });

    it('should update without calendar when no calendar event ID exists', async () => {
      const entityWithoutCalendar = new AppointmentEntity({ ...mockAppointmentEntity, calendarEventId: undefined });
      const updateData = { 
        startAt: new Date('2025-01-15T14:00:00Z'),
        endAt: new Date('2025-01-15T15:00:00Z')
      };

      mockAppointmentRepository.findById.mockResolvedValue(entityWithoutCalendar);
      mockAppointmentRepository.getConflictingAppointments.mockResolvedValue([]);
      mockAppointmentRepository.update.mockResolvedValue(new AppointmentEntity({ ...entityWithoutCalendar, ...updateData }));

      await appointmentService.editAppointment('appt-123', updateData);

      expect(mockCalendarService.updateCalendarEvent).not.toHaveBeenCalled();
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      const futureAppointment = new AppointmentEntity({
        ...mockAppointmentEntity,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        status: AppointmentStatus.SCHEDULED
      });

      mockAppointmentRepository.findById.mockResolvedValue(futureAppointment);
      mockAppointmentRepository.update.mockResolvedValue(new AppointmentEntity({
        ...futureAppointment,
        status: AppointmentStatus.CANCELLED
      }));

      const result = await appointmentService.cancelAppointment('appt-123');

      expect(mockAppointmentRepository.findById).toHaveBeenCalledWith('appt-123');
      expect(mockAppointmentRepository.update).toHaveBeenCalled();
      expect(mockCalendarService.deleteCalendarEvent).toHaveBeenCalledWith('cal-event-123');
      expect(result).toBe(true);
    });

    it('should throw NotFoundError when appointment does not exist', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(null);

      await expect(appointmentService.cancelAppointment('appt-123'))
        .rejects.toThrow(NotFoundError);

      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AppointmentCancellationError when appointment is already cancelled', async () => {
      const cancelledAppointment = new AppointmentEntity({
        ...mockAppointmentEntity,
        status: AppointmentStatus.CANCELLED
      });

      mockAppointmentRepository.findById.mockResolvedValue(cancelledAppointment);

      await expect(appointmentService.cancelAppointment('appt-123'))
        .rejects.toThrow(AppointmentCancellationError);

      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AppointmentCancellationError when appointment is completed', async () => {
      const completedAppointment = new AppointmentEntity({
        ...mockAppointmentEntity,
        status: AppointmentStatus.COMPLETED
      });

      mockAppointmentRepository.findById.mockResolvedValue(completedAppointment);

      await expect(appointmentService.cancelAppointment('appt-123'))
        .rejects.toThrow(AppointmentCancellationError);
    });

    it('should throw AppointmentCancellationError when appointment is too close (< 2 hours)', async () => {
      const soonAppointment = new AppointmentEntity({
        ...mockAppointmentEntity,
        startAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        status: AppointmentStatus.SCHEDULED
      });

      mockAppointmentRepository.findById.mockResolvedValue(soonAppointment);

      await expect(appointmentService.cancelAppointment('appt-123'))
        .rejects.toThrow(AppointmentCancellationError);
    });

    it('should handle calendar deletion failure gracefully', async () => {
      const futureAppointment = new AppointmentEntity({
        ...mockAppointmentEntity,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: AppointmentStatus.SCHEDULED
      });

      mockAppointmentRepository.findById.mockResolvedValue(futureAppointment);
      mockAppointmentRepository.update.mockResolvedValue(new AppointmentEntity({
        ...futureAppointment,
        status: AppointmentStatus.CANCELLED
      }));
      mockCalendarService.deleteCalendarEvent.mockRejectedValue(new Error('Calendar API error'));

      const result = await appointmentService.cancelAppointment('appt-123');

      expect(result).toBe(true); // Should still succeed despite calendar error
    });
  });

  describe('getActiveAppointmentsByEmailOrPhone', () => {
    it('should return active appointments for email', async () => {
      const activeAppointments = [mockAppointmentEntity];
      mockAppointmentRepository.getActiveAppointmentsByEmailOrPhone.mockResolvedValue(activeAppointments);

      const result = await appointmentService.getActiveAppointmentsByEmailOrPhone('john.doe@example.com');

      expect(mockAppointmentRepository.getActiveAppointmentsByEmailOrPhone)
        .toHaveBeenCalledWith('john.doe@example.com');
      expect(result).toEqual(activeAppointments);
    });

    it('should return active appointments for phone number', async () => {
      const activeAppointments = [mockAppointmentEntity];
      mockAppointmentRepository.getActiveAppointmentsByEmailOrPhone.mockResolvedValue(activeAppointments);

      const result = await appointmentService.getActiveAppointmentsByEmailOrPhone('+1234567890');

      expect(mockAppointmentRepository.getActiveAppointmentsByEmailOrPhone)
        .toHaveBeenCalledWith('+1234567890');
      expect(result).toEqual(activeAppointments);
    });

    it('should return empty array when no active appointments exist', async () => {
      mockAppointmentRepository.getActiveAppointmentsByEmailOrPhone.mockResolvedValue([]);

      const result = await appointmentService.getActiveAppointmentsByEmailOrPhone('john.doe@example.com');

      expect(result).toEqual([]);
    });
  });
});
