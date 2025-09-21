import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';
import { PostgresAppointmentRepository } from '../../repositories/postgresAppointmentRepository';
import { AppointmentService } from '../../services/appointmentService';
import { AppointmentEntity } from '../../models/AppointmentEntity';
import { AppointmentType, AppointmentStatus, ScheduleRequest } from '../../types/schedule';
import { ICalendarService } from '../../services/interfaces/ICalendarService';

// Mock Calendar Service for testing
class MockCalendarService implements ICalendarService {
  private events: Map<string, any> = new Map();
  private eventIdCounter = 1;

  async getBookedSlotsForDate(date: Date) {
    return [];
  }

  async createCalendarEvent(appointment: any): Promise<string> {
    const eventId = `test-event-${this.eventIdCounter++}`;
    this.events.set(eventId, appointment);
    return eventId;
  }

  async updateCalendarEvent(eventId: string, appointment: any): Promise<void> {
    if (!this.events.has(eventId)) {
      throw new Error(`Calendar event ${eventId} not found`);
    }
    this.events.set(eventId, appointment);
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    if (!this.events.has(eventId)) {
      throw new Error(`Calendar event ${eventId} not found`);
    }
    this.events.delete(eventId);
  }

  // Test helpers
  getEvent(eventId: string) {
    return this.events.get(eventId);
  }

  getAllEvents() {
    return Array.from(this.events.entries());
  }

  clear() {
    this.events.clear();
    this.eventIdCounter = 1;
  }
}

describe('AppointmentService Integration Tests', () => {
  let container: StartedTestContainer;
  let repository: PostgresAppointmentRepository;
  let calendarService: MockCalendarService;
  let appointmentService: AppointmentService;
  let pool: Pool;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new GenericContainer('postgres:14-alpine')
      .withEnvironment({
        POSTGRES_DB: 'test_medme',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test'
      })
      .withExposedPorts(5432)
      .start();

    // Set up database connection
    const connectionString = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(5432)}/test_medme`;
    process.env.DATABASE_URL = connectionString;

    pool = new Pool({ connectionString });
    
    // Create the appointments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name varchar(150) NOT NULL,
        last_name varchar(150) NOT NULL,
        email text,
        phone_number text,
        start_at timestamptz NOT NULL,
        end_at timestamptz NOT NULL,
        type text NOT NULL,
        status text NOT NULL DEFAULT 'scheduled',
        notes jsonb NOT NULL DEFAULT '{}',
        reason text,
        calendar_event_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        CONSTRAINT appointments_time_range CHECK (end_at > start_at),
        CONSTRAINT appointments_unique_slot UNIQUE (start_at, end_at),
        CONSTRAINT appointments_contact_required CHECK (email IS NOT NULL OR phone_number IS NOT NULL)
      )
    `);

    repository = new PostgresAppointmentRepository();
    calendarService = new MockCalendarService();
    appointmentService = new AppointmentService(repository, calendarService);
  });

  afterAll(async () => {
    await repository.close();
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await pool.query('DELETE FROM appointments');
    calendarService.clear();
  });

  describe('End-to-End Appointment Creation', () => {
    it('should create appointment with calendar event and store event ID', async () => {
      const appointmentData: ScheduleRequest = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        startAt: new Date('2024-01-15T10:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        notes: { reason: 'Annual checkup' },
        reason: 'Annual checkup',
      };

      const result = await appointmentService.createAppointment(appointmentData);

      // Verify appointment was created
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.calendarEventId).toBeDefined();

      // Verify calendar event was created
      const calendarEvents = calendarService.getAllEvents();
      expect(calendarEvents).toHaveLength(1);
      expect(calendarEvents[0][0]).toBe(result.calendarEventId);

      // Verify calendar event ID was persisted in database
      const dbResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [result.id]);
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].calendar_event_id).toBe(result.calendarEventId);
    });

    it('should rollback appointment creation if calendar event fails', async () => {
      // Make calendar service throw an error
      const originalCreate = calendarService.createCalendarEvent;
      calendarService.createCalendarEvent = jest.fn().mockRejectedValue(new Error('Calendar API error'));

      const appointmentData: ScheduleRequest = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        startAt: new Date('2024-01-15T14:00:00Z'),
        endAt: new Date('2024-01-15T15:00:00Z'),
        type: AppointmentType.FOLLOW_UP,
        notes: {},
      };

      // Should throw error and not create appointment
      await expect(appointmentService.createAppointment(appointmentData))
        .rejects.toThrow('Failed to create calendar event');

      // Verify no appointment was left in database
      const dbResult = await pool.query('SELECT COUNT(*) FROM appointments');
      expect(parseInt(dbResult.rows[0].count)).toBe(0);

      // Verify no calendar event was created
      expect(calendarService.getAllEvents()).toHaveLength(0);

      // Restore original method
      calendarService.createCalendarEvent = originalCreate;
    });

    it('should handle appointment editing with calendar updates', async () => {
      // Create initial appointment
      const appointmentData: ScheduleRequest = {
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob@example.com',
        startAt: new Date('2024-01-16T10:00:00Z'),
        endAt: new Date('2024-01-16T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        notes: {},
      };

      const created = await appointmentService.createAppointment(appointmentData);
      const originalEventId = created.calendarEventId!;

      // Edit the appointment
      const editData: Partial<ScheduleRequest> = {
        startAt: new Date('2024-01-16T14:00:00Z'),
        endAt: new Date('2024-01-16T15:00:00Z'),
        type: AppointmentType.FOLLOW_UP,
      };

      const updated = await appointmentService.editAppointment(created.id!, editData);

      // Verify appointment was updated
      expect(updated).toBeDefined();
      expect(updated!.startAt).toEqual(new Date('2024-01-16T14:00:00Z'));
      expect(updated!.type).toBe(AppointmentType.FOLLOW_UP);
      expect(updated!.calendarEventId).toBe(originalEventId);

      // Verify calendar event was updated
      const calendarEvent = calendarService.getEvent(originalEventId);
      expect(calendarEvent).toBeDefined();
    });

    it('should handle appointment cancellation with calendar cleanup', async () => {
      // Create appointment far in the future to avoid 2-hour cancellation rule
      const appointmentData: ScheduleRequest = {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 7 days + 1 hour from now
        type: AppointmentType.CONSULTATION,
        notes: {},
      };

      const created = await appointmentService.createAppointment(appointmentData);
      const eventId = created.calendarEventId!;

      // Cancel appointment
      const cancelled = await appointmentService.cancelAppointment(created.id!);
      expect(cancelled).toBe(true);

      // Verify appointment status updated
      const dbResult = await pool.query('SELECT status FROM appointments WHERE id = $1', [created.id]);
      expect(dbResult.rows[0].status).toBe(AppointmentStatus.CANCELLED);

      // Verify calendar event was deleted
      expect(calendarService.getEvent(eventId)).toBeUndefined();
    });
  });

  describe('Conflict Detection Integration', () => {
    it('should prevent double-booking with same person', async () => {
      // Create first appointment
      const appointmentData: ScheduleRequest = {
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        startAt: new Date('2024-01-18T10:00:00Z'),
        endAt: new Date('2024-01-18T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        notes: {},
      };

      await appointmentService.createAppointment(appointmentData);

      // Try to create overlapping appointment with same email
      const conflictingData: ScheduleRequest = {
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        startAt: new Date('2024-01-18T10:30:00Z'),
        endAt: new Date('2024-01-18T11:30:00Z'),
        type: AppointmentType.FOLLOW_UP,
        notes: {},
      };

      await expect(appointmentService.createAppointment(conflictingData))
        .rejects.toThrow('You already have an appointment scheduled');

      // Verify only one appointment exists
      const dbResult = await pool.query('SELECT COUNT(*) FROM appointments');
      expect(parseInt(dbResult.rows[0].count)).toBe(1);

      // Verify only one calendar event exists
      expect(calendarService.getAllEvents()).toHaveLength(1);
    });

    it('should prevent double-booking between different people', async () => {
      // Create first appointment
      const appointmentData1: ScheduleRequest = {
        firstName: 'David',
        lastName: 'Miller',
        email: 'david@example.com',
        startAt: new Date('2024-01-19T10:00:00Z'),
        endAt: new Date('2024-01-19T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        notes: {},
      };

      await appointmentService.createAppointment(appointmentData1);

      // Try to create overlapping appointment with different person
      const appointmentData2: ScheduleRequest = {
        firstName: 'Eve',
        lastName: 'Davis',
        email: 'eve@example.com',
        startAt: new Date('2024-01-19T10:30:00Z'),
        endAt: new Date('2024-01-19T11:30:00Z'),
        type: AppointmentType.FOLLOW_UP,
        notes: {},
      };

      await expect(appointmentService.createAppointment(appointmentData2))
        .rejects.toThrow('Time slot from');

      // Verify only one appointment exists
      const dbResult = await pool.query('SELECT COUNT(*) FROM appointments');
      expect(parseInt(dbResult.rows[0].count)).toBe(1);
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain consistency between database and calendar service', async () => {
      const appointments: ScheduleRequest[] = [
        {
          firstName: 'User1',
          lastName: 'Test',
          email: 'user1@example.com',
          startAt: new Date('2024-01-20T09:00:00Z'),
          endAt: new Date('2024-01-20T10:00:00Z'),
          type: AppointmentType.CONSULTATION,
          notes: {},
        },
        {
          firstName: 'User2',
          lastName: 'Test',
          email: 'user2@example.com',
          startAt: new Date('2024-01-20T11:00:00Z'),
          endAt: new Date('2024-01-20T12:00:00Z'),
          type: AppointmentType.FOLLOW_UP,
          notes: {},
        },
        {
          firstName: 'User3',
          lastName: 'Test',
          phoneNumber: '+1111111111',
          startAt: new Date('2024-01-20T13:00:00Z'),
          endAt: new Date('2024-01-20T14:00:00Z'),
          type: AppointmentType.CHECK_UP,
          notes: {},
        }
      ];

      // Create all appointments
      const created = await Promise.all(
        appointments.map(apt => appointmentService.createAppointment(apt))
      );

      // Verify database state
      const dbResult = await pool.query('SELECT id, calendar_event_id FROM appointments ORDER BY start_at');
      expect(dbResult.rows).toHaveLength(3);

      // Verify calendar state
      const calendarEvents = calendarService.getAllEvents();
      expect(calendarEvents).toHaveLength(3);

      // Verify each appointment has matching calendar event
      for (const appointment of created) {
        expect(appointment.calendarEventId).toBeDefined();
        expect(calendarService.getEvent(appointment.calendarEventId!)).toBeDefined();
        
        // Verify database has the calendar event ID
        const dbRow = dbResult.rows.find(row => row.id === appointment.id);
        expect(dbRow.calendar_event_id).toBe(appointment.calendarEventId);
      }
    });

    it('should handle calendar service failures gracefully', async () => {
      // Test calendar service error during update
      const appointmentData: ScheduleRequest = {
        firstName: 'Error',
        lastName: 'Test',
        email: 'error@example.com',
        startAt: new Date('2024-01-21T10:00:00Z'),
        endAt: new Date('2024-01-21T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        notes: {},
      };

      const created = await appointmentService.createAppointment(appointmentData);

      // Make calendar service fail for updates
      const originalUpdate = calendarService.updateCalendarEvent;
      calendarService.updateCalendarEvent = jest.fn().mockRejectedValue(new Error('Calendar API error'));

      // Edit should continue despite calendar failure (appointment updated, calendar error logged)
      const editData: Partial<ScheduleRequest> = {
        type: AppointmentType.FOLLOW_UP,
      };

      const updated = await appointmentService.editAppointment(created.id!, editData);
      expect(updated!.type).toBe(AppointmentType.FOLLOW_UP);

      // Restore method
      calendarService.updateCalendarEvent = originalUpdate;
    });
  });

  describe('Search and Retrieval Tests', () => {
    it('should correctly retrieve active appointments by email or phone', async () => {
      // Create appointments with different statuses
      const activeData: ScheduleRequest = {
        firstName: 'Active',
        lastName: 'User',
        email: 'active@example.com',
        phoneNumber: '+2222222222',
        startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 5 days + 1 hour from now
        type: AppointmentType.CONSULTATION,
        notes: {},
      };

      const created = await appointmentService.createAppointment(activeData);

      // Create another appointment and cancel it (far in future to avoid 2-hour rule)
      const cancelData: ScheduleRequest = {
        firstName: 'Cancelled',
        lastName: 'User',
        email: 'active@example.com',
        startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 7 days + 1 hour from now
        type: AppointmentType.FOLLOW_UP,
        notes: {},
      };

      const cancelled = await appointmentService.createAppointment(cancelData);
      await appointmentService.cancelAppointment(cancelled.id!);

      // Search by email should only return active appointments
      const byEmail = await appointmentService.getActiveAppointmentsByEmailOrPhone('active@example.com');
      expect(byEmail).toHaveLength(1);
      expect(byEmail[0].id).toBe(created.id);

      // Search by phone should also work
      const byPhone = await appointmentService.getActiveAppointmentsByEmailOrPhone('+2222222222');
      expect(byPhone).toHaveLength(1);
      expect(byPhone[0].id).toBe(created.id);
    });
  });
});
