import { Appointment } from '../types/schedule';

export class MessageTemplates {
  /**
   * Generate appointment confirmation message
   */
  static generateConfirmationMessage(appointment: Appointment): {
    subject: string;
    body: string;
  } {
    const appointmentDate = appointment.startAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const appointmentTime = appointment.startAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const subject = `Appointment Confirmed - ${appointmentDate} at ${appointmentTime}`;
    
    const body = `Hi ${appointment.firstName}! Your ${appointment.type} appointment is confirmed for ${appointmentDate} at ${appointmentTime}. MedMe Medical Center - Please arrive 15min early. Questions? Call (555) 123-4567 or email oluwatoba.aribo@gmail.com`.trim();

    return { subject, body };
  }

  /**
   * Generate appointment reschedule message
   */
  static generateRescheduleMessage(appointment: Appointment, oldDateTime?: { start: Date; end: Date }): {
    subject: string;
    body: string;
  } {
    const newDate = appointment.startAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const newTime = appointment.startAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const subject = `Appointment Rescheduled - New Time: ${newDate} at ${newTime}`;
    
    let oldDateTimeInfo = '';
    if (oldDateTime) {
      const oldDate = oldDateTime.start.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const oldTime = oldDateTime.start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      oldDateTimeInfo = `\n🔄 PREVIOUS APPOINTMENT:\n• Date: ${oldDate}\n• Time: ${oldTime}\n`;
    }

    const body = `Hi ${appointment.firstName}! Your ${appointment.type} appointment has been rescheduled to ${newDate} at ${newTime}. MedMe Medical Center - Please arrive 15min early. Questions? Call (555) 123-4567`.trim();

    return { subject, body };
  }

  /**
   * Generate appointment cancellation message
   */
  static generateCancellationMessage(appointment: Appointment): {
    subject: string;
    body: string;
  } {
    const appointmentDate = appointment.startAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const appointmentTime = appointment.startAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const subject = `Appointment Cancelled - ${appointmentDate} at ${appointmentTime}`;
    
    const body = `Hi ${appointment.firstName}! Your ${appointment.type} appointment for ${appointmentDate} at ${appointmentTime} has been cancelled. Need to reschedule? Call (555) 123-4567 or use our AI booking assistant. - MedMe Medical Center`.trim();

    return { subject, body };
  }

  /**
   * Calculate appointment duration in minutes
   */
  private static calculateDuration(startAt: Date, endAt: Date): number {
    return Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60));
  }
}
