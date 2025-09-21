import { AppointmentEntity } from '../../models/AppointmentEntity';
import { AppointmentType, AppointmentStatus } from '../../types/schedule';

describe('AppointmentEntity Unit Tests', () => {
  it('should create appointment entity with all fields', () => {
    const data = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '+1234567890',
      startAt: new Date('2024-01-15T10:00:00Z'),
      endAt: new Date('2024-01-15T11:00:00Z'),
      type: AppointmentType.CONSULTATION,
      status: AppointmentStatus.SCHEDULED,
      notes: { reason: 'Annual checkup' },
      reason: 'Annual checkup',
      calendarEventId: 'cal-123',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    };

    const appointment = new AppointmentEntity(data);

    expect(appointment.id).toBe(data.id);
    expect(appointment.firstName).toBe(data.firstName);
    expect(appointment.lastName).toBe(data.lastName);
    expect(appointment.email).toBe(data.email);
    expect(appointment.phoneNumber).toBe(data.phoneNumber);
    expect(appointment.startAt).toBe(data.startAt);
    expect(appointment.endAt).toBe(data.endAt);
    expect(appointment.type).toBe(data.type);
    expect(appointment.status).toBe(data.status);
    expect(appointment.notes).toBe(data.notes);
    expect(appointment.reason).toBe(data.reason);
    expect(appointment.calendarEventId).toBe(data.calendarEventId);
    expect(appointment.createdAt).toBe(data.createdAt);
    expect(appointment.updatedAt).toBe(data.updatedAt);
  });

  it('should create appointment entity with minimal required fields', () => {
    const data = {
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '+0987654321',
      startAt: new Date('2024-01-15T14:00:00Z'),
      endAt: new Date('2024-01-15T15:00:00Z'),
      type: AppointmentType.FOLLOW_UP,
      status: AppointmentStatus.SCHEDULED,
      notes: {},
      createdAt: new Date(),
    };

    const appointment = new AppointmentEntity(data);

    expect(appointment.firstName).toBe(data.firstName);
    expect(appointment.lastName).toBe(data.lastName);
    expect(appointment.phoneNumber).toBe(data.phoneNumber);
    expect(appointment.email).toBeUndefined();
    expect(appointment.reason).toBeUndefined();
    expect(appointment.calendarEventId).toBeUndefined();
    expect(appointment.updatedAt).toBeNull();
  });

  it('should handle optional email field', () => {
    const dataWithEmail = {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      startAt: new Date(),
      endAt: new Date(),
      type: AppointmentType.CONSULTATION,
      status: AppointmentStatus.SCHEDULED,
      notes: {},
      createdAt: new Date(),
    };

    const appointmentWithEmail = new AppointmentEntity(dataWithEmail);
    expect(appointmentWithEmail.email).toBe('alice@example.com');

    const dataWithoutEmail = {
      firstName: 'Bob',
      lastName: 'Wilson',
      phoneNumber: '+1111111111',
      startAt: new Date(),
      endAt: new Date(),
      type: AppointmentType.CONSULTATION,
      status: AppointmentStatus.SCHEDULED,
      notes: {},
      createdAt: new Date(),
    };

    const appointmentWithoutEmail = new AppointmentEntity(dataWithoutEmail);
    expect(appointmentWithoutEmail.email).toBeUndefined();
  });
});
