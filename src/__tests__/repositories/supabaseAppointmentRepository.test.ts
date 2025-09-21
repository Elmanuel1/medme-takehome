import { SupabaseAppointmentRepository } from '../../repositories/supabaseAppointmentRepository';
import { AppointmentEntity } from '../../models/AppointmentEntity';
import { AppointmentType, AppointmentStatus, ScheduleRequest } from '../../types/schedule';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn()
} as unknown as jest.Mocked<SupabaseClient>;

// Helper to create mock query builder
const createMockQueryBuilder = () => ({
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn()
});

describe('SupabaseAppointmentRepository', () => {
  let repository: SupabaseAppointmentRepository;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let mockScheduleRequest: ScheduleRequest;
  let mockAppointmentEntity: AppointmentEntity;
  let mockDbRow: any;

  beforeEach(() => {
    mockQueryBuilder = createMockQueryBuilder();
    (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQueryBuilder);
    
    repository = new SupabaseAppointmentRepository(mockSupabaseClient, 'appointments');

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

    mockAppointmentEntity = new AppointmentEntity(mockScheduleRequest);

    mockDbRow = {
      id: 'appt-123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone_number: '+1234567890',
      start_at: '2025-01-15T10:00:00.000Z',
      end_at: '2025-01-15T11:00:00.000Z',
      type: AppointmentType.CONSULTATION,
      notes: { description: 'Regular checkup' },
      reason: 'Annual physical examination',
      status: AppointmentStatus.SCHEDULED,
      calendar_event_id: 'cal-event-123',
      created_at: '2025-01-10T09:00:00.000Z',
      updated_at: null
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create appointment successfully', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: mockDbRow, error: null });

      const result = await repository.create(mockAppointmentEntity);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('appointments');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([expect.objectContaining({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com'
      })]);
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.single).toHaveBeenCalled();
      expect(result).toBeInstanceOf(AppointmentEntity);
      expect(result.firstName).toBe('John');
    });

    it('should throw error when duplicate appointment exists (23505)', async () => {
      const duplicateError = { code: '23505', message: 'duplicate key value violates unique constraint' };
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: duplicateError });

      await expect(repository.create(mockAppointmentEntity))
        .rejects.toThrow('Appointment already exists for this time range');
    });

    it('should throw error when create fails with other error', async () => {
      const dbError = { code: '42000', message: 'syntax error' };
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: dbError });

      await expect(repository.create(mockAppointmentEntity))
        .rejects.toThrow('Create failed: syntax error');
    });
  });

  describe('update', () => {
    it('should update appointment successfully', async () => {
      const updatedRow = { ...mockDbRow, notes: { description: 'Updated notes' }, updated_at: '2025-01-15T12:00:00.000Z' };
      mockQueryBuilder.single.mockResolvedValue({ data: updatedRow, error: null });

      const updatedEntity = new AppointmentEntity({ ...mockAppointmentEntity, notes: { description: 'Updated notes' } });
      const result = await repository.update('appt-123', updatedEntity);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('appointments');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith([expect.objectContaining({
        notes: { description: 'Updated notes' }
      })]);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'appt-123');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.single).toHaveBeenCalled();
      expect(result).toBeInstanceOf(AppointmentEntity);
      expect(result.notes).toEqual({ description: 'Updated notes' });
    });

    it('should throw error when update fails', async () => {
      const dbError = { message: 'update failed' };
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: dbError });

      const updatedEntity = new AppointmentEntity({ ...mockAppointmentEntity, notes: { description: 'Updated notes' } });
      await expect(repository.update('appt-123', updatedEntity))
        .rejects.toThrow('Update failed: update failed');
    });
  });

  describe('delete', () => {
    it('should delete appointment successfully and return true', async () => {
      // Create a mock delete query that returns the result directly
      const deleteQuery = {
        eq: jest.fn().mockResolvedValue({ error: null, count: 1 })
      };
      mockQueryBuilder.delete.mockReturnValue(deleteQuery);

      const result = await repository.delete('appt-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('appointments');
      expect(mockQueryBuilder.delete).toHaveBeenCalledWith({ count: 'exact' });
      expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'appt-123');
      expect(result).toBe(true);
    });

    it('should return false when no records were deleted', async () => {
      const deleteQuery = {
        eq: jest.fn().mockResolvedValue({ error: null, count: 0 })
      };
      mockQueryBuilder.delete.mockReturnValue(deleteQuery);

      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
    });

    it('should throw error when delete fails', async () => {
      const dbError = { message: 'delete failed' };
      const deleteQuery = {
        eq: jest.fn().mockResolvedValue({ error: dbError, count: null })
      };
      mockQueryBuilder.delete.mockReturnValue(deleteQuery);

      await expect(repository.delete('appt-123'))
        .rejects.toThrow('Delete failed: delete failed');
    });
  });

  describe('findById', () => {
    it('should find appointment by id successfully', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: mockDbRow, error: null });

      const result = await repository.findById('appt-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('appointments');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'appt-123');
      expect(mockQueryBuilder.maybeSingle).toHaveBeenCalled();
      expect(result).toBeInstanceOf(AppointmentEntity);
      expect(result!.id).toBe('appt-123');
    });

    it('should return null when appointment not found', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should throw error when find fails', async () => {
      const dbError = { message: 'find failed' };
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: dbError });

      await expect(repository.findById('appt-123'))
        .rejects.toThrow('Find by id failed: find failed');
    });
  });

  describe('isAvailable', () => {
    it('should return true when time slot is available', async () => {
      // Mock query builder chain methods
      const query = {
        ...mockQueryBuilder,
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis()
      };
      query.lt.mockReturnValue(query);
      query.gt.mockReturnValue(query);
      
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);
      
      // Mock the final query result
      Object.assign(query, { count: 0, error: null });

      const startAt = new Date('2025-01-15T10:00:00Z');
      const endAt = new Date('2025-01-15T11:00:00Z');
      
      const result = await repository.isAvailable(startAt, endAt);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('appointments');
      expect(query.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(query.lt).toHaveBeenCalledWith('start_at', endAt.toISOString());
      expect(query.gt).toHaveBeenCalledWith('end_at', startAt.toISOString());
      expect(result).toBe(true);
    });

    it('should return false when time slot is not available', async () => {
      const query = {
        ...mockQueryBuilder,
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis()
      };
      query.lt.mockReturnValue(query);
      query.gt.mockReturnValue(query);
      
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);
      
      // Mock the final query result with conflicts
      Object.assign(query, { count: 1, error: null });

      const startAt = new Date('2025-01-15T10:00:00Z');
      const endAt = new Date('2025-01-15T11:00:00Z');
      
      const result = await repository.isAvailable(startAt, endAt);

      expect(result).toBe(false);
    });

    it('should exclude appointment when excludeId is provided', async () => {
      const query = {
        ...mockQueryBuilder,
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis()
      };
      query.lt.mockReturnValue(query);
      query.gt.mockReturnValue(query);
      query.neq.mockReturnValue(query);
      
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);
      
      // Mock the final query result
      Object.assign(query, { count: 0, error: null });

      const startAt = new Date('2025-01-15T10:00:00Z');
      const endAt = new Date('2025-01-15T11:00:00Z');
      
      const result = await repository.isAvailable(startAt, endAt, 'exclude-appt-123');

      expect(query.neq).toHaveBeenCalledWith('id', 'exclude-appt-123');
      expect(result).toBe(true);
    });

    it('should throw error when availability check fails', async () => {
      const query = {
        ...mockQueryBuilder,
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis()
      };
      query.lt.mockReturnValue(query);
      query.gt.mockReturnValue(query);
      
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(query);
      
      // Mock the final query result with error
      Object.assign(query, { count: null, error: { message: 'availability check failed' } });

      const startAt = new Date('2025-01-15T10:00:00Z');
      const endAt = new Date('2025-01-15T11:00:00Z');
      
      await expect(repository.isAvailable(startAt, endAt))
        .rejects.toThrow('Availability check failed: availability check failed');
    });
  });

  describe('getConflictingAppointments', () => {
    it('should return conflicting appointments for the time slot', async () => {
      const conflictingAppointments = [mockDbRow, { ...mockDbRow, id: 'appt-456' }];
      mockQueryBuilder.lt.mockReturnThis();
      mockQueryBuilder.gt.mockReturnThis();
      mockQueryBuilder.in.mockReturnThis();
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQueryBuilder);
      Object.assign(mockQueryBuilder, { data: conflictingAppointments, error: null });

      const startAt = new Date('2025-01-15T10:00:00Z');
      const endAt = new Date('2025-01-15T11:00:00Z');
      
      const result = await repository.getConflictingAppointments(startAt, endAt);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('appointments');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.lt).toHaveBeenCalledWith('start_at', endAt.toISOString());
      expect(mockQueryBuilder.gt).toHaveBeenCalledWith('end_at', startAt.toISOString());
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('status', ['scheduled', 'confirmed']);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(AppointmentEntity);
      expect(result[1]).toBeInstanceOf(AppointmentEntity);
    });

    it('should exclude appointment when excludeId is provided', async () => {
      mockQueryBuilder.lt.mockReturnThis();
      mockQueryBuilder.gt.mockReturnThis();
      mockQueryBuilder.in.mockReturnThis();
      mockQueryBuilder.neq.mockReturnThis();
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQueryBuilder);
      Object.assign(mockQueryBuilder, { data: [], error: null });

      const startAt = new Date('2025-01-15T10:00:00Z');
      const endAt = new Date('2025-01-15T11:00:00Z');
      
      await repository.getConflictingAppointments(startAt, endAt, 'exclude-appt-123');

      expect(mockQueryBuilder.neq).toHaveBeenCalledWith('id', 'exclude-appt-123');
    });

    it('should return empty array when no conflicts found', async () => {
      mockQueryBuilder.lt.mockReturnThis();
      mockQueryBuilder.gt.mockReturnThis();
      mockQueryBuilder.in.mockReturnThis();
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQueryBuilder);
      Object.assign(mockQueryBuilder, { data: [], error: null });

      const result = await repository.getConflictingAppointments(
        new Date('2025-01-15T10:00:00Z'),
        new Date('2025-01-15T11:00:00Z')
      );

      expect(result).toEqual([]);
    });

    it('should throw error when conflict check fails', async () => {
      mockQueryBuilder.lt.mockReturnThis();
      mockQueryBuilder.gt.mockReturnThis();
      mockQueryBuilder.in.mockReturnThis();
      (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQueryBuilder);
      Object.assign(mockQueryBuilder, { data: null, error: { message: 'conflict check failed' } });

      await expect(repository.getConflictingAppointments(
        new Date('2025-01-15T10:00:00Z'),
        new Date('2025-01-15T11:00:00Z')
      )).rejects.toThrow('Conflict check failed: conflict check failed');
    });
  });

  describe('getActiveAppointmentsByEmailOrPhone', () => {
    it('should return active appointments for email', async () => {
      const activeAppointments = [mockDbRow, { ...mockDbRow, id: 'appt-456' }];
      mockQueryBuilder.order.mockResolvedValue({ data: activeAppointments, error: null });

      const result = await repository.getActiveAppointmentsByEmailOrPhone('john.doe@example.com');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('appointments');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.or).toHaveBeenCalledWith('email.eq.john.doe@example.com,phone_number.eq.john.doe@example.com');
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('status', ['scheduled', 'confirmed']);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('start_at', { ascending: false });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(AppointmentEntity);
      expect(result[1]).toBeInstanceOf(AppointmentEntity);
    });

    it('should return active appointments for phone number', async () => {
      const activeAppointments = [mockDbRow];
      mockQueryBuilder.order.mockResolvedValue({ data: activeAppointments, error: null });

      const result = await repository.getActiveAppointmentsByEmailOrPhone('+1234567890');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('appointments');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.or).toHaveBeenCalledWith('email.eq.+1234567890,phone_number.eq.+1234567890');
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('status', ['scheduled', 'confirmed']);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('start_at', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(AppointmentEntity);
    });

    it('should return empty array when no active appointments found', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const result = await repository.getActiveAppointmentsByEmailOrPhone('no-appointments@example.com');

      expect(result).toEqual([]);
    });

    it('should handle null data response', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: null, error: null });

      const result = await repository.getActiveAppointmentsByEmailOrPhone('john.doe@example.com');

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const dbError = { message: 'query failed' };
      mockQueryBuilder.order.mockResolvedValue({ data: null, error: dbError });

      await expect(repository.getActiveAppointmentsByEmailOrPhone('john.doe@example.com'))
        .rejects.toThrow('Query by email or phone failed: query failed');
    });
  });

  describe('mapRowToEntity', () => {
    it('should properly map database row to AppointmentEntity', async () => {
      // Test the private method indirectly through findById
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: mockDbRow, error: null });

      const result = await repository.findById('appt-123');

      expect(result).toBeInstanceOf(AppointmentEntity);
      expect(result!.id).toBe(mockDbRow.id);
      expect(result!.firstName).toBe(mockDbRow.first_name);
      expect(result!.lastName).toBe(mockDbRow.last_name);
      expect(result!.email).toBe(mockDbRow.email);
      expect(result!.phoneNumber).toBe(mockDbRow.phone_number);
      expect(result!.startAt).toEqual(new Date(mockDbRow.start_at));
      expect(result!.endAt).toEqual(new Date(mockDbRow.end_at));
      expect(result!.type).toBe(mockDbRow.type);
      expect(result!.notes).toEqual(mockDbRow.notes);
      expect(result!.reason).toBe(mockDbRow.reason);
      expect(result!.status).toBe(mockDbRow.status);
      expect(result!.calendarEventId).toBe(mockDbRow.calendar_event_id);
      expect(result!.createdAt).toEqual(new Date(mockDbRow.created_at));
      expect(result!.updatedAt).toBe(mockDbRow.updated_at);
    });

    it('should handle undefined/null values properly', async () => {
      const rowWithNulls = {
        ...mockDbRow,
        phone_number: null,
        reason: null,
        calendar_event_id: null,
        updated_at: null
      };
      
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: rowWithNulls, error: null });

      const result = await repository.findById('appt-123');

      expect(result!.phoneNumber).toBeUndefined();
      expect(result!.reason).toBeUndefined();
      expect(result!.calendarEventId).toBeUndefined();
      expect(result!.updatedAt).toBeNull();
    });
  });
});
