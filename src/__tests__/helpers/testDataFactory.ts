import { AppointmentEntity } from '../../models/AppointmentEntity';
import { AppointmentType, AppointmentStatus } from '../../types/schedule';

export class TestDataFactory {
  static createAppointmentEntity(overrides: Partial<AppointmentEntity> = {}): AppointmentEntity {
    const defaults = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phoneNumber: '+1234567890',
      startAt: new Date('2024-01-15T10:00:00Z'),
      endAt: new Date('2024-01-15T11:00:00Z'),
      type: AppointmentType.CONSULTATION,
      status: AppointmentStatus.SCHEDULED,
      notes: { test: 'data' },
      reason: 'Test appointment',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    };

    return new AppointmentEntity({ ...defaults, ...overrides });
  }

  static createAppointmentWithDateRange(
    startAt: Date,
    endAt: Date,
    overrides: Partial<AppointmentEntity> = {}
  ): AppointmentEntity {
    return this.createAppointmentEntity({
      startAt,
      endAt,
      ...overrides,
    });
  }

  static createAppointmentWithContact(
    email?: string,
    phoneNumber?: string,
    overrides: Partial<AppointmentEntity> = {}
  ): AppointmentEntity {
    return this.createAppointmentEntity({
      email,
      phoneNumber,
      ...overrides,
    });
  }

  static createAppointmentWithStatus(
    status: AppointmentStatus,
    overrides: Partial<AppointmentEntity> = {}
  ): AppointmentEntity {
    return this.createAppointmentEntity({
      status,
      ...overrides,
    });
  }

  static createMultipleAppointments(count: number): AppointmentEntity[] {
    return Array.from({ length: count }, (_, index) =>
      this.createAppointmentEntity({
        firstName: `User${index + 1}`,
        email: `user${index + 1}@example.com`,
        startAt: new Date(`2024-01-${15 + index}T10:00:00Z`),
        endAt: new Date(`2024-01-${15 + index}T11:00:00Z`),
      })
    );
  }
}
