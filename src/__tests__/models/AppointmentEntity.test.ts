import { AppointmentEntity } from '../../models/AppointmentEntity';
import { AppointmentType, AppointmentStatus, ScheduleRequest, Appointment } from '../../types/schedule';

describe('AppointmentEntity', () => {
  const mockScheduleRequest: ScheduleRequest = {
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

  const mockAppointment: Appointment = {
    id: 'appt-123',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phoneNumber: '+0987654321',
    startAt: new Date('2025-01-20T14:00:00Z'),
    endAt: new Date('2025-01-20T15:00:00Z'),
    type: AppointmentType.FOLLOW_UP,
    notes: { description: 'Follow-up visit' },
    reason: 'Check test results',
    status: AppointmentStatus.CONFIRMED,
    calendarEventId: 'cal-event-456',
    createdAt: new Date('2025-01-10T09:00:00Z'),
    updatedAt: new Date('2025-01-12T10:00:00Z')
  };

  describe('constructor with ScheduleRequest', () => {
    it('should create entity from ScheduleRequest with default values', () => {
      const entity = new AppointmentEntity(mockScheduleRequest);

      expect(entity.id).toBeUndefined();
      expect(entity.firstName).toBe('John');
      expect(entity.lastName).toBe('Doe');
      expect(entity.email).toBe('john.doe@example.com');
      expect(entity.phoneNumber).toBe('+1234567890');
      expect(entity.startAt).toEqual(new Date('2025-01-15T10:00:00Z'));
      expect(entity.endAt).toEqual(new Date('2025-01-15T11:00:00Z'));
      expect(entity.type).toBe(AppointmentType.CONSULTATION);
      expect(entity.notes).toEqual({ description: 'Regular checkup' });
      expect(entity.reason).toBe('Annual physical examination');
      expect(entity.status).toBe(AppointmentStatus.SCHEDULED);
      expect(entity.calendarEventId).toBeUndefined();
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeNull();
    });

    it('should handle optional fields correctly', () => {
      const minimalRequest: ScheduleRequest = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        startAt: new Date('2025-01-15T10:00:00Z'),
        endAt: new Date('2025-01-15T11:00:00Z'),
        type: AppointmentType.CHECK_UP,
        notes: { description: 'Basic checkup' }
      };

      const entity = new AppointmentEntity(minimalRequest);

      expect(entity.phoneNumber).toBeUndefined();
      expect(entity.reason).toBeUndefined();
      expect(entity.status).toBe(AppointmentStatus.SCHEDULED);
    });
  });

  describe('constructor with Appointment', () => {
    it('should create entity from existing Appointment', () => {
      const entity = new AppointmentEntity(mockAppointment);

      expect(entity.id).toBe('appt-123');
      expect(entity.firstName).toBe('Jane');
      expect(entity.lastName).toBe('Smith');
      expect(entity.email).toBe('jane.smith@example.com');
      expect(entity.phoneNumber).toBe('+0987654321');
      expect(entity.startAt).toEqual(new Date('2025-01-20T14:00:00Z'));
      expect(entity.endAt).toEqual(new Date('2025-01-20T15:00:00Z'));
      expect(entity.type).toBe(AppointmentType.FOLLOW_UP);
      expect(entity.notes).toEqual({ description: 'Follow-up visit' });
      expect(entity.reason).toBe('Check test results');
      expect(entity.status).toBe(AppointmentStatus.CONFIRMED);
      expect(entity.calendarEventId).toBe('cal-event-456');
      expect(entity.createdAt).toEqual(new Date('2025-01-10T09:00:00Z'));
      expect(entity.updatedAt).toEqual(new Date('2025-01-12T10:00:00Z'));
    });
  });

  describe('updateStatus', () => {
    it('should update status and updatedAt timestamp', () => {
      const entity = new AppointmentEntity(mockScheduleRequest);
      const beforeUpdate = new Date();
      
      entity.updateStatus(AppointmentStatus.CONFIRMED);
      
      expect(entity.status).toBe(AppointmentStatus.CONFIRMED);
      expect(entity.updatedAt).toBeInstanceOf(Date);
      expect(entity.updatedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('updateAppointmentTime', () => {
    it('should update appointment times and updatedAt timestamp', () => {
      const entity = new AppointmentEntity(mockScheduleRequest);
      const newStartAt = new Date('2025-01-16T11:00:00Z');
      const newEndAt = new Date('2025-01-16T12:00:00Z');
      const beforeUpdate = new Date();
      
      entity.updateAppointmentTime(newStartAt, newEndAt);
      
      expect(entity.startAt).toEqual(newStartAt);
      expect(entity.endAt).toEqual(newEndAt);
      expect(entity.updatedAt).toBeInstanceOf(Date);
      expect(entity.updatedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('setCalendarEventId', () => {
    it('should set calendar event ID and update timestamp', () => {
      const entity = new AppointmentEntity(mockScheduleRequest);
      const eventId = 'cal-event-789';
      const beforeUpdate = new Date();
      
      entity.setCalendarEventId(eventId);
      
      expect(entity.calendarEventId).toBe(eventId);
      expect(entity.updatedAt).toBeInstanceOf(Date);
      expect(entity.updatedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

});
