import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';
import { PostgresAppointmentRepository } from '../../repositories/postgresAppointmentRepository';
import { AppointmentEntity } from '../../models/AppointmentEntity';
import { AppointmentType, AppointmentStatus } from '../../types/schedule';

describe('PostgresAppointmentRepository Integration Tests', () => {
  let container: StartedTestContainer;
  let repository: PostgresAppointmentRepository;
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
  });

  afterAll(async () => {
    await repository.close();
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await pool.query('DELETE FROM appointments');
  });

  describe('create', () => {
    it('should create a new appointment', async () => {
      const appointmentData = new AppointmentEntity({
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
        createdAt: new Date(),
      });

      const result = await repository.create(appointmentData);

      expect(result).toBeInstanceOf(AppointmentEntity);
      expect(result.id).toBeDefined();
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.type).toBe(AppointmentType.CONSULTATION);
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
    });

    it('should create appointment with only phone number', async () => {
      const appointmentData = new AppointmentEntity({
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+0987654321',
        startAt: new Date('2024-01-15T14:00:00Z'),
        endAt: new Date('2024-01-15T15:00:00Z'),
        type: AppointmentType.FOLLOW_UP,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      const result = await repository.create(appointmentData);

      expect(result).toBeInstanceOf(AppointmentEntity);
      expect(result.email).toBeUndefined();
      expect(result.phoneNumber).toBe('+0987654321');
    });
  });

  describe('findById', () => {
    it('should find appointment by id', async () => {
      const appointmentData = new AppointmentEntity({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        startAt: new Date('2024-01-16T09:00:00Z'),
        endAt: new Date('2024-01-16T10:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      const created = await repository.create(appointmentData);
      const found = await repository.findById(created.id!);

      expect(found).toBeInstanceOf(AppointmentEntity);
      expect(found!.id).toBe(created.id);
      expect(found!.firstName).toBe('Alice');
    });

    it('should return null for non-existent id', async () => {
      const result = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update appointment date, time, type and notes', async () => {
      const appointmentData = new AppointmentEntity({
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob@example.com',
        startAt: new Date('2024-01-17T10:00:00Z'),
        endAt: new Date('2024-01-17T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: { original: 'note' },
        createdAt: new Date(),
      });

      const created = await repository.create(appointmentData);

      const updateData = new AppointmentEntity({
        startAt: new Date('2024-01-17T14:00:00Z'),
        endAt: new Date('2024-01-17T15:00:00Z'),
        type: AppointmentType.FOLLOW_UP,
        notes: { updated: 'new note' },
      } as any);

      const updated = await repository.update(created.id!, updateData);

      expect(updated.startAt).toEqual(new Date('2024-01-17T14:00:00Z'));
      expect(updated.endAt).toEqual(new Date('2024-01-17T15:00:00Z'));
      expect(updated.type).toBe(AppointmentType.FOLLOW_UP);
      expect(updated.notes).toEqual({ updated: 'new note' });
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete appointment', async () => {
      const appointmentData = new AppointmentEntity({
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        startAt: new Date('2024-01-18T10:00:00Z'),
        endAt: new Date('2024-01-18T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      const created = await repository.create(appointmentData);
      const deleted = await repository.delete(created.id!);

      expect(deleted).toBe(true);

      const found = await repository.findById(created.id!);
      expect(found).toBeNull();
    });

    it('should return false for non-existent appointment', async () => {
      const result = await repository.delete('00000000-0000-0000-0000-000000000000');
      expect(result).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true for available time slot', async () => {
      const startAt = new Date('2024-01-19T10:00:00Z');
      const endAt = new Date('2024-01-19T11:00:00Z');

      const result = await repository.isAvailable(startAt, endAt);
      expect(result).toBe(true);
    });

    it('should return false for conflicting time slot', async () => {
      // Create an appointment
      const appointmentData = new AppointmentEntity({
        firstName: 'Dave',
        lastName: 'Miller',
        email: 'dave@example.com',
        startAt: new Date('2024-01-20T10:00:00Z'),
        endAt: new Date('2024-01-20T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      await repository.create(appointmentData);

      // Check overlapping slot
      const startAt = new Date('2024-01-20T10:30:00Z');
      const endAt = new Date('2024-01-20T11:30:00Z');

      const result = await repository.isAvailable(startAt, endAt);
      expect(result).toBe(false);
    });
  });

  describe('getConflictingAppointments', () => {
    it('should find conflicting appointments', async () => {
      // Create two appointments
      const appointment1 = new AppointmentEntity({
        firstName: 'Eve',
        lastName: 'Davis',
        email: 'eve@example.com',
        startAt: new Date('2024-01-21T10:00:00Z'),
        endAt: new Date('2024-01-21T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      const appointment2 = new AppointmentEntity({
        firstName: 'Frank',
        lastName: 'Garcia',
        email: 'frank@example.com',
        startAt: new Date('2024-01-21T14:00:00Z'),
        endAt: new Date('2024-01-21T15:00:00Z'),
        type: AppointmentType.FOLLOW_UP,
        status: AppointmentStatus.CONFIRMED,
        notes: {},
        createdAt: new Date(),
      });

      await repository.create(appointment1);
      await repository.create(appointment2);

      // Check for conflicts with overlapping slot
      const conflicts = await repository.getConflictingAppointments(
        new Date('2024-01-21T10:30:00Z'),
        new Date('2024-01-21T11:30:00Z')
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].firstName).toBe('Eve');
    });

    it('should exclude specified appointment from conflicts', async () => {
      const appointmentData = new AppointmentEntity({
        firstName: 'Grace',
        lastName: 'Lee',
        email: 'grace@example.com',
        startAt: new Date('2024-01-22T10:00:00Z'),
        endAt: new Date('2024-01-22T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      const created = await repository.create(appointmentData);

      // Check for conflicts excluding the appointment itself
      const conflicts = await repository.getConflictingAppointments(
        new Date('2024-01-22T10:30:00Z'),
        new Date('2024-01-22T11:30:00Z'),
        created.id
      );

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getActiveAppointmentsByEmailOrPhone', () => {
    it('should find appointments by email', async () => {
      const appointmentData = new AppointmentEntity({
        firstName: 'Henry',
        lastName: 'Wilson',
        email: 'henry@example.com',
        phoneNumber: '+1111111111',
        startAt: new Date('2024-01-23T10:00:00Z'),
        endAt: new Date('2024-01-23T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      await repository.create(appointmentData);

      const results = await repository.getActiveAppointmentsByEmailOrPhone('henry@example.com');

      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Henry');
    });

    it('should find appointments by phone number', async () => {
      const appointmentData = new AppointmentEntity({
        firstName: 'Ivy',
        lastName: 'Brown',
        phoneNumber: '+2222222222',
        startAt: new Date('2024-01-24T10:00:00Z'),
        endAt: new Date('2024-01-24T11:00:00Z'),
        type: AppointmentType.FOLLOW_UP,
        status: AppointmentStatus.CONFIRMED,
        notes: {},
        createdAt: new Date(),
      });

      await repository.create(appointmentData);

      const results = await repository.getActiveAppointmentsByEmailOrPhone('+2222222222');

      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('Ivy');
    });

    it('should not return cancelled appointments', async () => {
      const appointmentData = new AppointmentEntity({
        firstName: 'Jack',
        lastName: 'Taylor',
        email: 'jack@example.com',
        startAt: new Date('2024-01-25T10:00:00Z'),
        endAt: new Date('2024-01-25T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      const created = await repository.create(appointmentData);
      
      // Update status to cancelled using direct SQL since we don't have updateStatus method
      await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', [AppointmentStatus.CANCELLED, created.id]);

      const results = await repository.getActiveAppointmentsByEmailOrPhone('jack@example.com');

      expect(results).toHaveLength(0);
    });
  });

  describe('Edge Cases and Constraint Violations', () => {
    it('should handle duplicate time slot constraint violation', async () => {
      const startAt = new Date('2024-01-15T10:00:00Z');
      const endAt = new Date('2024-01-15T11:00:00Z');

      // Create first appointment
      const appointment1 = new AppointmentEntity({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        startAt,
        endAt,
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      await repository.create(appointment1);

      // Try to create second appointment with same time slot
      const appointment2 = new AppointmentEntity({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        startAt,
        endAt,
        type: AppointmentType.FOLLOW_UP,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      await expect(repository.create(appointment2)).rejects.toThrow();
    });

    it('should handle missing contact info constraint violation', async () => {
      const appointment = new AppointmentEntity({
        firstName: 'No',
        lastName: 'Contact',
        // Neither email nor phoneNumber provided
        startAt: new Date('2024-01-15T10:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      await expect(repository.create(appointment)).rejects.toThrow();
    });

    it('should handle invalid time range constraint violation', async () => {
      const appointment = new AppointmentEntity({
        firstName: 'Invalid',
        lastName: 'Time',
        email: 'invalid@example.com',
        startAt: new Date('2024-01-15T11:00:00Z'), // End before start
        endAt: new Date('2024-01-15T10:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      await expect(repository.create(appointment)).rejects.toThrow();
    });

    it('should handle extremely long names gracefully', async () => {
      const longName = 'A'.repeat(200); // Longer than varchar(150)
      
      const appointment = new AppointmentEntity({
        firstName: longName,
        lastName: 'Doe',
        email: 'test@example.com',
        startAt: new Date('2024-01-15T10:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      await expect(repository.create(appointment)).rejects.toThrow();
    });

    it('should handle SQL injection attempts safely', async () => {
      const maliciousEmail = "'; DROP TABLE appointments; --";
      
      const appointment = new AppointmentEntity({
        firstName: 'Malicious',
        lastName: 'User',
        email: maliciousEmail,
        startAt: new Date('2024-01-15T10:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      const result = await repository.create(appointment);
      expect(result.email).toBe(maliciousEmail);
      
      // Verify table still exists by querying it
      const count = await pool.query('SELECT COUNT(*) FROM appointments');
      expect(parseInt(count.rows[0].count)).toBe(1);
    });

    it('should handle complex nested JSON in notes', async () => {
      const complexNotes = {
        patient: {
          allergies: ['penicillin', 'nuts'],
          medications: [
            { name: 'aspirin', dosage: '100mg', frequency: 'daily' }
          ],
          vitals: {
            bloodPressure: { systolic: 120, diastolic: 80 },
            heartRate: 72
          }
        },
        symptoms: {
          primary: 'headache',
          secondary: ['fatigue', 'dizziness'],
          severity: 7
        }
      };

      const appointment = new AppointmentEntity({
        firstName: 'Complex',
        lastName: 'Notes',
        email: 'complex@example.com',
        startAt: new Date('2024-01-15T10:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: complexNotes,
        createdAt: new Date(),
      });

      const result = await repository.create(appointment);
      expect(result.notes).toEqual(complexNotes);
    });

    it('should handle rapid concurrent operations', async () => {
      const appointments = Array.from({ length: 5 }, (_, i) => 
        new AppointmentEntity({
          firstName: `User${i}`,
          lastName: 'Concurrent',
          email: `user${i}@example.com`,
          startAt: new Date(`2024-01-${15 + i}T10:00:00Z`),
          endAt: new Date(`2024-01-${15 + i}T11:00:00Z`),
          type: AppointmentType.CONSULTATION,
          status: AppointmentStatus.SCHEDULED,
          notes: {},
          createdAt: new Date(),
        })
      );

      // Create all appointments concurrently
      const results = await Promise.all(
        appointments.map(apt => repository.create(apt))
      );

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.firstName).toBe(`User${i}`);
      });
    });

    it('should handle special characters in names', async () => {
      const appointment = new AppointmentEntity({
        firstName: "José María O'Connor",
        lastName: "Müller-Żółć",
        email: 'special@example.com',
        startAt: new Date('2024-01-15T10:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      const result = await repository.create(appointment);
      expect(result.firstName).toBe("José María O'Connor");
      expect(result.lastName).toBe("Müller-Żółć");
    });

    it('should handle leap year date', async () => {
      const appointment = new AppointmentEntity({
        firstName: 'Leap',
        lastName: 'Year',
        email: 'leap@example.com',
        startAt: new Date('2024-02-29T10:00:00Z'), // 2024 is a leap year
        endAt: new Date('2024-02-29T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      const result = await repository.create(appointment);
      expect(result.startAt.getMonth()).toBe(1); // February (0-indexed)
      expect(result.startAt.getDate()).toBe(29);
    });
  });
});
