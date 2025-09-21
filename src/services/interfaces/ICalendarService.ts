import { BusySlot, Appointment } from '../../types/schedule';

export interface ICalendarService {
  getBookedSlotsForDate(date: Date): Promise<BusySlot[]>;
  createCalendarEvent(appointment: Appointment): Promise<string>; // Returns calendar event ID
  updateCalendarEvent(eventId: string, appointment: Appointment): Promise<void>;
  deleteCalendarEvent(eventId: string): Promise<void>;
}
