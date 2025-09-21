import { Pool } from 'pg';
import { PostgresAppointmentRepository } from '../../repositories/postgresAppointmentRepository';
import { AppointmentEntity } from '../../models/AppointmentEntity';
import { AppointmentType, AppointmentStatus } from '../../types/schedule';

// Mock pg Pool
const mockQuery = jest.fn();
const mockOn = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    on: mockOn,
    end: mockEnd,
  }))
}));

describe('PostgresAppointmentRepository Unit Tests', () => {
  let repository: PostgresAppointmentRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PostgresAppointmentRepository();
  });

  describe('create method', () => {
    it('should map all appointment fields correctly in SQL query', async () => {
      const appointment = new AppointmentEntity({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        startAt: new Date('2024-01-15T10:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: { reason: 'Test' },
        reason: 'Annual checkup',
        calendarEventId: 'cal-123',
        createdAt: new Date(),
      });

      const mockResult = {
        rows: [{
          id: 'test-id',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone_number: '+1234567890',
          start_at: '2024-01-15T10:00:00Z',
          end_at: '2024-01-15T11:00:00Z',
          type: 'consultation',
          status: 'scheduled',
          notes: '{"reason":"Test"}',
          reason: 'Annual checkup',
          calendar_event_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: null,
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await repository.create(appointment);

      // Verify the SQL query includes all expected fields
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO appointments'),
        [
          'John',
          'Doe',
          'john@example.com',
          '+1234567890',
          appointment.startAt,
          appointment.endAt,
          'consultation',
          'scheduled', // Should always be 'scheduled' for new appointments
          '{"reason":"Test"}',
          'Annual checkup',
          null // calendarEventId is not set in constructor, so it's null
        ]
      );
    });

    it('should handle null email correctly', async () => {
      const appointment = new AppointmentEntity({
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

      const mockResult = {
        rows: [{ 
          id: 'test-id',
          first_name: 'Jane',
          last_name: 'Smith',
          email: null,
          phone_number: '+0987654321',
          start_at: '2024-01-15T14:00:00Z',
          end_at: '2024-01-15T15:00:00Z',
          type: 'follow_up',
          status: 'scheduled',
          notes: '{}',
          reason: null,
          calendar_event_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: null,
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await repository.create(appointment);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['Jane', 'Smith', null, '+0987654321']) // email should be null
      );
    });
  });

  describe('update method', () => {
    it('should include calendar_event_id in update query', async () => {
      const appointment = new AppointmentEntity({
        startAt: new Date('2024-01-15T14:00:00Z'),
        endAt: new Date('2024-01-15T15:00:00Z'),
        type: AppointmentType.FOLLOW_UP,
        notes: { updated: true },
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        status: AppointmentStatus.SCHEDULED,
        createdAt: new Date(),
      });
      appointment.calendarEventId = 'cal-456';

      const mockResult = {
        rows: [{
          id: 'test-id',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone_number: '+1234567890',
          start_at: '2024-01-15T14:00:00Z',
          end_at: '2024-01-15T15:00:00Z',
          type: 'follow_up',
          status: 'scheduled',
          notes: '{"updated":true}',
          reason: 'Test',
          calendar_event_id: 'cal-456',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await repository.update('test-id', appointment);

      // Verify the update query includes calendar_event_id and status
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('calendar_event_id = $5'),
        [
          appointment.startAt,
          appointment.endAt,
          'follow_up',
          '{"updated":true}',
          'cal-456', // calendar_event_id should be included
          'scheduled', // status
          expect.any(Date), // updated_at
          'test-id'
        ]
      );
    });

    it('should handle null calendar_event_id in update', async () => {
      const appointment = new AppointmentEntity({
        startAt: new Date('2024-01-15T14:00:00Z'),
        endAt: new Date('2024-01-15T15:00:00Z'),
        type: AppointmentType.CONSULTATION,
        notes: {},
        calendarEventId: undefined,
      } as any);

      const mockResult = {
        rows: [{
          id: 'test-id',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone_number: null,
          start_at: '2024-01-15T14:00:00Z',
          end_at: '2024-01-15T15:00:00Z',
          type: 'consultation',
          status: 'scheduled',
          notes: '{}',
          reason: null,
          calendar_event_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await repository.update('test-id', appointment);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([undefined, 'scheduled']) // calendarEventId can be undefined, status included
      );
    });
  });

  describe('mapRowToEntity method', () => {
    it('should correctly map database row to AppointmentEntity', async () => {
      const mockDbRow = {
        id: 'test-uuid',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone_number: '+1234567890',
        start_at: '2024-01-15T10:00:00Z',
        end_at: '2024-01-15T11:00:00Z',
        type: 'consultation',
        status: 'scheduled',
        notes: '{"reason":"Test","priority":"high"}',
        reason: 'Annual checkup',
        calendar_event_id: 'cal-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      };

      const mockResult = { rows: [mockDbRow] };
      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.findById('test-uuid');

      expect(result).toBeInstanceOf(AppointmentEntity);
      expect(result!.id).toBe('test-uuid');
      expect(result!.firstName).toBe('John');
      expect(result!.lastName).toBe('Doe');
      expect(result!.email).toBe('john@example.com');
      expect(result!.phoneNumber).toBe('+1234567890');
      expect(result!.startAt).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(result!.endAt).toEqual(new Date('2024-01-15T11:00:00Z'));
      expect(result!.type).toBe('consultation');
      expect(result!.status).toBe('scheduled');
      expect(result!.notes).toEqual({ reason: 'Test', priority: 'high' });
      expect(result!.reason).toBe('Annual checkup');
      expect(result!.calendarEventId).toBe('cal-123');
      expect(result!.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(result!.updatedAt).toEqual(new Date('2024-01-01T01:00:00Z'));
    });

    it('should handle null/undefined fields correctly', async () => {
      const mockDbRow = {
        id: 'test-uuid',
        first_name: 'Jane',
        last_name: 'Smith',
        email: null,
        phone_number: '+0987654321',
        start_at: '2024-01-15T14:00:00Z',
        end_at: '2024-01-15T15:00:00Z',
        type: 'follow_up',
        status: 'scheduled',
        notes: '{}',
        reason: null,
        calendar_event_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      };

      const mockResult = { rows: [mockDbRow] };
      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.findById('test-uuid');

      expect(result!.email).toBeUndefined();
      expect(result!.reason).toBeUndefined();
      expect(result!.calendarEventId).toBeUndefined();
      expect(result!.updatedAt).toBeUndefined();
      expect(result!.phoneNumber).toBe('+0987654321');
      expect(result!.notes).toEqual({});
    });

    it('should parse JSON notes correctly', async () => {
      const complexNotes = {
        symptoms: ['headache', 'fatigue'],
        medications: [{ name: 'aspirin', dosage: '100mg' }],
        vitals: { bp: '120/80', hr: 72 }
      };

      const mockDbRow = {
        id: 'test-uuid',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone_number: null,
        start_at: '2024-01-15T10:00:00Z',
        end_at: '2024-01-15T11:00:00Z',
        type: 'consultation',
        status: 'scheduled',
        notes: JSON.stringify(complexNotes),
        reason: null,
        calendar_event_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      };

      const mockResult = { rows: [mockDbRow] };
      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.findById('test-uuid');

      expect(result!.notes).toEqual(complexNotes);
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      mockQuery.mockRejectedValue(new Error('Connection failed'));

      const appointment = new AppointmentEntity({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        startAt: new Date(),
        endAt: new Date(),
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        notes: {},
        createdAt: new Date(),
      });

      await expect(repository.create(appointment)).rejects.toThrow('Connection failed');
    });

    it('should handle malformed JSON in notes field', async () => {
      const mockDbRow = {
        id: 'test-uuid',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone_number: null,
        start_at: '2024-01-15T10:00:00Z',
        end_at: '2024-01-15T11:00:00Z',
        type: 'consultation',
        status: 'scheduled',
        notes: 'invalid json{',
        reason: null,
        calendar_event_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      };

      const mockResult = { rows: [mockDbRow] };
      mockQuery.mockResolvedValue(mockResult);

      await expect(repository.findById('test-uuid')).rejects.toThrow();
    });
  });
});
