import { Pool, QueryResult } from 'pg';
import { IAppointmentRepository } from './interfaces/IAppointmentRepository';
import { AppointmentEntity } from '../models/AppointmentEntity';

export class PostgresAppointmentRepository implements IAppointmentRepository {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // maximum number of clients in the pool
      idleTimeoutMillis: 30000, // close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }

  async create(appointment: AppointmentEntity): Promise<AppointmentEntity> {
    const query = `
      INSERT INTO appointments (
        first_name, last_name, email, phone_number, start_at, end_at, 
        type, status, notes, reason, calendar_event_id
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      appointment.firstName,
      appointment.lastName,
      appointment.email || null,
      appointment.phoneNumber || null,
      appointment.startAt,
      appointment.endAt,
      appointment.type,
      'scheduled',
      JSON.stringify(appointment.notes || {}),
      appointment.reason || null,
      appointment.calendarEventId || null
    ];

    try {
      const result: QueryResult = await this.pool.query(query, values);
      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Database error in create:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<AppointmentEntity | null> {
    const query = 'SELECT * FROM appointments WHERE id = $1';
    const result: QueryResult = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEntity(result.rows[0]);
  }

  async update(id: string, appointment: AppointmentEntity): Promise<AppointmentEntity> {
    const query = `UPDATE appointments SET start_at = $1, end_at = $2, type = $3, notes = $4, calendar_event_id = $5, status = $6, updated_at = $7 WHERE id = $8 RETURNING *`;
    const values = [appointment.startAt, appointment.endAt, appointment.type, JSON.stringify(appointment.notes), appointment.calendarEventId, appointment.status, new Date(), id];
    const result = await this.pool.query(query, values);
    return this.mapRowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM appointments WHERE id = $1';
    const result: QueryResult = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }


  async isAvailable(startAt: Date, endAt: Date, excludeId?: string): Promise<boolean> {
    const conflictingAppointments = await this.getConflictingAppointments(startAt, endAt, excludeId);
    return conflictingAppointments.length === 0;
  }

  async getConflictingAppointments(startAt: Date, endAt: Date, excludeId?: string): Promise<AppointmentEntity[]> {
    let query = `
      SELECT * FROM appointments 
      WHERE start_at < $1 
        AND end_at > $2 
        AND status IN ('scheduled', 'confirmed')
    `;
    
    const values: (Date | string)[] = [endAt, startAt];
    
    if (excludeId) {
      query += ` AND id != $3`;
      values.push(excludeId);
    }
    
    const result: QueryResult = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async getActiveAppointmentsByEmailOrPhone(emailOrPhone: string): Promise<AppointmentEntity[]> {
    const query = `
      SELECT * FROM appointments 
      WHERE (email = $1 OR phone_number = $1) 
        AND status IN ('scheduled', 'confirmed')
      ORDER BY start_at
    `;
    
    const result: QueryResult = await this.pool.query(query, [emailOrPhone]);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  private mapRowToEntity(row: any): AppointmentEntity {
    return new AppointmentEntity({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      startAt: new Date(row.start_at),
      endAt: new Date(row.end_at),
      type: row.type,
      notes: typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes,
      reason: row.reason || undefined,
      status: row.status,
      calendarEventId: row.calendar_event_id || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
