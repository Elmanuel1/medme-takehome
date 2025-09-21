import { ScheduleRequest } from '../../types/schedule';
import { AppointmentEntity } from '../../models/AppointmentEntity';

export interface IAppointmentService {
  // Core appointment operations
  createAppointment(data: ScheduleRequest): Promise<AppointmentEntity>;
  editAppointment(appointmentId: string, data: Partial<ScheduleRequest>): Promise<AppointmentEntity | null>;
  cancelAppointment(appointmentId: string): Promise<boolean>;

  // Booking queries
  getActiveAppointmentsByEmailOrPhone(emailOrPhone: string): Promise<AppointmentEntity[]>;
}
