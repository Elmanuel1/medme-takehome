import { BusySlot, Appointment } from '../types/schedule';
import { ICalendarService } from './interfaces/ICalendarService';
import { calendar_v3 } from '@googleapis/calendar';

/**
 * Google Calendar implementation of ICalendarService using FreeBusy API via official SDK.
 * Expects a pre-configured calendar client instance via constructor.
 */
export class CalendarService implements ICalendarService {
  private readonly rangeDays: number;
  private readonly timeZone: string;
  private readonly calendar: calendar_v3.Calendar;
  private readonly primaryCalendarId: string;

  constructor(config: { primaryCalendarId: string; rangeDays: number; timeZone?: string }, calendar: calendar_v3.Calendar) {
    this.rangeDays = config.rangeDays;
    this.timeZone = config.timeZone || 'UTC';
    this.calendar = calendar;
    this.primaryCalendarId = config.primaryCalendarId;
  }

  async getBookedSlotsForDate(date: Date): Promise<BusySlot[]> {
    const timeMin = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
    const timeMax = new Date(timeMin);
    timeMax.setUTCDate(timeMax.getUTCDate() + this.rangeDays);
    timeMax.setUTCHours(23, 59, 59, 0);

    try {
      const res = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          timeZone: this.timeZone,
          items: [{ id: this.primaryCalendarId }]
        }
      });

      const calendars = res?.data?.calendars || {};
      const slots: BusySlot[] = [];
      
      // Iterate through all calendars in the response (handles both 'primary' and email keys)
      for (const calendarId in calendars) {
        const calendarData = calendars[calendarId];
        const busy = calendarData?.busy || [];
        
        for (const b of busy) {
          slots.push({ 
            start: new Date(b.start as string),
            end: new Date(b.end as string),
            isAvailable: false 
          });
        }
      }

      return slots;
    } catch (err: any) {
      console.error('🚨 Google FreeBusy API Error:', {
        message: err?.message,
        status: err?.code || err?.response?.status,
        statusText: err?.response?.statusText,
        details: err?.errors || err?.response?.data,
        config: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          primaryCalendarId: this.primaryCalendarId,
          timeZone: this.timeZone
        },
        fullError: err
      });
      
      const status = err?.code || err?.response?.status;
      const details = err?.errors || err?.response?.data || err?.message;
      throw new Error(`Google FreeBusy request failed${status ? ` (status ${status})` : ''}: ${
        typeof details === 'string' ? details : JSON.stringify(details)
      }`);
    }
  }

  async createCalendarEvent(appointment: Appointment): Promise<string> {
    try {
      const event: calendar_v3.Schema$Event = {
        summary: `${appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)} - ${appointment.firstName} ${appointment.lastName}`,
        description: `${appointment.reason || `${appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)} appointment`}\n\nPatient: ${appointment.firstName} ${appointment.lastName}\nEmail: ${appointment.email || 'Not provided'}\nPhone: ${appointment.phoneNumber || 'Not provided'}`,
        start: {
          dateTime: appointment.startAt.toISOString(),
          timeZone: this.timeZone,
        },
        end: {
          dateTime: appointment.endAt.toISOString(),
          timeZone: this.timeZone,
        },
        // Removed attendees field to avoid Domain-Wide Delegation requirement
        // Patient info is included in the description instead
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 15 }, // 15 minutes before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.primaryCalendarId,
        requestBody: event,
      });

      if (!response.data.id) {
        throw new Error('Calendar event creation failed: no event ID returned');
      }

      return response.data.id;
    } catch (err: any) {
      console.error('🚨 Google Calendar Event Creation Error:', {
        message: err?.message,
        status: err?.code || err?.response?.status,
        statusText: err?.response?.statusText,
        details: err?.errors || err?.response?.data,
        appointmentId: appointment.id,
        eventDetails: {
          summary: `${appointment.type} - ${appointment.firstName} ${appointment.lastName}`,
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
          calendarId: this.primaryCalendarId
        },
        fullError: err
      });
      
      const status = err?.code || err?.response?.status;
      const details = err?.errors || err?.response?.data || err?.message;
      throw new Error(`Calendar event creation failed${status ? ` (status ${status})` : ''}: ${
        typeof details === 'string' ? details : JSON.stringify(details)
      }`);
    }
  }

  async updateCalendarEvent(eventId: string, appointment: Appointment): Promise<void> {
    try {
      const event: calendar_v3.Schema$Event = {
        summary: `${appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)} - ${appointment.firstName} ${appointment.lastName}`,
        description: `${appointment.reason || `${appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)} appointment`}\n\nPatient: ${appointment.firstName} ${appointment.lastName}\nEmail: ${appointment.email || 'Not provided'}\nPhone: ${appointment.phoneNumber || 'Not provided'}`,
        start: {
          dateTime: appointment.startAt.toISOString(),
          timeZone: this.timeZone,
        },
        end: {
          dateTime: appointment.endAt.toISOString(),
          timeZone: this.timeZone,
        },
        // Removed attendees field to avoid Domain-Wide Delegation requirement
      };

      await this.calendar.events.update({
        calendarId: this.primaryCalendarId,
        eventId: eventId,
        requestBody: event,
      });
    } catch (err: any) {
      console.error('🚨 Google Calendar Event Update Error:', {
        message: err?.message,
        status: err?.code || err?.response?.status,
        statusText: err?.response?.statusText,
        details: err?.errors || err?.response?.data,
        eventId: eventId,
        appointmentId: appointment.id,
        eventDetails: {
          summary: `${appointment.type} - ${appointment.firstName} ${appointment.lastName}`,
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
          calendarId: this.primaryCalendarId
        },
        fullError: err
      });
      
      const status = err?.code || err?.response?.status;
      const details = err?.errors || err?.response?.data || err?.message;
      throw new Error(`Calendar event update failed${status ? ` (status ${status})` : ''}: ${
        typeof details === 'string' ? details : JSON.stringify(details)
      }`);
    }
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: this.primaryCalendarId,
        eventId: eventId,
      });
    } catch (err: any) {
      // If event is already deleted (404), consider it successful
      if (err?.code === 404 || err?.response?.status === 404) {
        console.log('✅ Calendar event already deleted (404), considering successful:', eventId);
        return;
      }
      
      console.error('🚨 Google Calendar Event Deletion Error:', {
        message: err?.message,
        status: err?.code || err?.response?.status,
        statusText: err?.response?.statusText,
        details: err?.errors || err?.response?.data,
        eventId: eventId,
        calendarId: this.primaryCalendarId,
        fullError: err
      });
      
      const status = err?.code || err?.response?.status;
      const details = err?.errors || err?.response?.data || err?.message;
      throw new Error(`Calendar event deletion failed${status ? ` (status ${status})` : ''}: ${
        typeof details === 'string' ? details : JSON.stringify(details)
      }`);
    }
  }
}
