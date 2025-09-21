import { SupabaseClient } from '@supabase/supabase-js';
import { AppointmentEntity } from '../models/AppointmentEntity';
import { IAppointmentRepository } from './interfaces/IAppointmentRepository';
import { ConflictError } from '../types/errors';

export class SupabaseAppointmentRepository implements IAppointmentRepository {
  private readonly tableName: string;
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient, tableName = 'appointments') {
    this.supabase = supabase;
    this.tableName = tableName;
  }

  private mapRowToEntity(row: any): AppointmentEntity {
    return new AppointmentEntity({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email ?? undefined,
      phoneNumber: row.phone_number ?? undefined,
      startAt: new Date(row.start_at),
      endAt: new Date(row.end_at),
      type: row.type,
      notes: row.notes,
      reason: row.reason ?? undefined,
      status: row.status,
      calendarEventId: row.calendar_event_id ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    });
  }

  async create(appointment: AppointmentEntity): Promise<AppointmentEntity> {
    const row: any = {
      first_name: appointment.firstName,
      last_name: appointment.lastName,
      email: appointment.email,
      phone_number: appointment.phoneNumber,
      start_at: appointment.startAt,
      end_at: appointment.endAt,
      type: appointment.type,
      notes: appointment.notes,
      reason: appointment.reason,
      status: appointment.status,
      calendar_event_id: appointment.calendarEventId,
      created_at: appointment.createdAt,
      updated_at: appointment.updatedAt ?? undefined,
    };

    // Only include id if it's provided (for updates), let database generate it for new records
    if (appointment.id) {
      row.id = appointment.id;
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('🚨 Supabase Create Error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        appointmentData: {
          id: appointment.id,
          email: appointment.email,
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
          type: appointment.type
        },
        fullError: error
      });
      
      if ((error as any).code === '23505') {
        throw new ConflictError('Appointment already exists for this time range');
      }
      throw new Error(`Create failed: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }

  async update(id: string, appointment: AppointmentEntity): Promise<AppointmentEntity> {
    const now = new Date();
    const row = {
      id: appointment.id,
      first_name: appointment.firstName,
      last_name: appointment.lastName,
      email: appointment.email,
      phone_number: appointment.phoneNumber,
      start_at: appointment.startAt,
      end_at: appointment.endAt,
      type: appointment.type,
      notes: appointment.notes,
      reason: appointment.reason,
      status: appointment.status,
      calendar_event_id: appointment.calendarEventId,
      created_at: appointment.createdAt,
      updated_at: appointment.updatedAt ?? now,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update([row])
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from(this.tableName)
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  async findById(id: string): Promise<AppointmentEntity | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Find by id failed: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRowToEntity(data);
  }

  async isAvailable(startAt: Date, endAt: Date, excludeId?: string): Promise<boolean> {
    const startIso = startAt.toISOString();
    const endIso = endAt.toISOString();

    let query = this.supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .lt('start_at', endIso)
      .gt('end_at', startIso);

    // Exclude the current appointment if editing
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;

    if (error) {
      console.error('🚨 Supabase Availability Check Error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        queryParams: {
          startIso,
          endIso,
          excludeId,
          tableName: this.tableName
        },
        fullError: error
      });
      throw new Error(`Availability check failed: ${error.message}`);
    }

    return (count ?? 0) === 0;
  }

  async getConflictingAppointments(startAt: Date, endAt: Date, excludeId?: string): Promise<AppointmentEntity[]> {
    const startIso = startAt.toISOString();
    const endIso = endAt.toISOString();

    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .lt('start_at', endIso)
      .gt('end_at', startIso)
      .in('status', ['scheduled', 'confirmed']); // Only check active appointments

    // Exclude the current appointment if editing
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('🚨 Supabase Conflict Check Error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        queryParams: {
          startIso,
          endIso,
          excludeId,
          tableName: this.tableName
        },
        fullError: error
      });
      throw new Error(`Conflict check failed: ${error.message}`);
    }

    return (data ?? []).map((r) => this.mapRowToEntity(r));
  }

  async getActiveAppointmentsByEmailOrPhone(emailOrPhone: string): Promise<AppointmentEntity[]> {
    const activeStatuses = ['scheduled', 'confirmed'];
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')  //this can break, fix later
      .or(`email.eq.${emailOrPhone},phone_number.eq.${emailOrPhone}`)
      .in('status', activeStatuses)
      .order('start_at', { ascending: false });

    if (error) {
      throw new Error(`Query by email or phone failed: ${error.message}`);
    }

    return (data ?? []).map((r) => this.mapRowToEntity(r));
  }
}
