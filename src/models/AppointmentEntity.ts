import { AppointmentType, AppointmentStatus, Appointment, ScheduleRequest } from '../types/schedule';

/**
 * Entity representing the appointments table row (camelCase columns).
 */
export class AppointmentEntity {
  public id?: string;
  public firstName: string;
  public lastName: string;
  public email?: string;
  public phoneNumber?: string;
  public startAt: Date;
  public endAt: Date;
  public type: AppointmentType;
  public status: AppointmentStatus;
  public reason?: string;
  public calendarEventId?: string;
  public createdAt?: Date;
  public updatedAt?: Date | null;
  public notes: Record<string, any>;

  constructor(data: ScheduleRequest | Appointment) {
    if ('id' in data && 'status' in data && 'createdAt' in data) {
      // It's an Appointment (from database)
      this.id = data.id;
      this.firstName = data.firstName;
      this.lastName = data.lastName;
      this.email = data.email;
      this.phoneNumber = data.phoneNumber;
      this.startAt = data.startAt;
      this.endAt = data.endAt;
      this.type = data.type;
      this.status = data.status;
      this.reason = data.reason;
      this.calendarEventId = data.calendarEventId;
      this.createdAt = data.createdAt;
      this.updatedAt = data.updatedAt;
      this.notes = data.notes;
    } else {
      // It's a ScheduleRequest (from user input)
      this.id = undefined;
      this.firstName = data.firstName;
      this.lastName = data.lastName;
      this.email = data.email;
      this.phoneNumber = data.phoneNumber;
      this.startAt = data.startAt;
      this.endAt = data.endAt;
      this.type = data.type;
      this.status = AppointmentStatus.SCHEDULED;
      this.reason = data.reason;
      this.calendarEventId = undefined;
      this.createdAt = new Date();
      this.updatedAt = null;
      this.notes = data.notes;
    }
  }

  public updateStatus(status: AppointmentStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  public updateAppointmentTime(startAt: Date, endAt: Date): void {
    this.startAt = startAt;
    this.endAt = endAt;
    this.updatedAt = new Date();
  }

  public setCalendarEventId(eventId: string): void {
    this.calendarEventId = eventId;
    this.updatedAt = new Date();
  }

}
