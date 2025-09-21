import { AppointmentEntity } from '../../models/AppointmentEntity';

export interface IAppointmentRepository {
  create(appointment: AppointmentEntity): Promise<AppointmentEntity>;
  update(id: string, appointment: AppointmentEntity): Promise<AppointmentEntity>;
  delete(id: string): Promise<boolean>;

  findById(id: string): Promise<AppointmentEntity | null>;
  isAvailable(startAt: Date, endAt: Date, excludeId?: string): Promise<boolean>;
  getConflictingAppointments(startAt: Date, endAt: Date, excludeId?: string): Promise<AppointmentEntity[]>;
  getActiveAppointmentsByEmailOrPhone(emailOrPhone: string): Promise<AppointmentEntity[]>;
}
