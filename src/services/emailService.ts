import axios from 'axios';
import { Appointment } from '../types/schedule';
import { MessageTemplates } from './emailTemplates';

export class MessageService {
  private readonly zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/23072494/umv9s0s/';

  /**
   * Send appointment confirmation message (email or SMS)
   */
  async sendConfirmationMessage(appointment: Appointment): Promise<void> {
    if (!appointment.id) {
      console.log(`⚠️  No ID provided for appointment, skipping confirmation message`);
      return;
    }

    const { subject, body } = MessageTemplates.generateConfirmationMessage(appointment);
    
    // Send email if available
    if (appointment.email) {
      await this.sendMessage({
        to: appointment.email,
        subject,
        body,
        type: 'email',
        appointmentId: appointment.id,
        eventType: 'confirmation'
      });
    }

    // Send SMS if phone available
    if (appointment.phoneNumber) {
      await this.sendMessage({
        to: appointment.phoneNumber,
        subject,
        body,
        type: 'sms',
        appointmentId: appointment.id,
        eventType: 'confirmation'
      });
    }

    if (!appointment.email && !appointment.phoneNumber) {
      console.log(`⚠️  No email or phone provided for appointment ${appointment.id}, skipping confirmation message`);
    }
  }

  /**
   * Send appointment reschedule message (email or SMS)
   */
  async sendRescheduleMessage(appointment: Appointment, oldDateTime?: { start: Date; end: Date }): Promise<void> {
    if (!appointment.id) {
      console.log(`⚠️  No ID provided for appointment, skipping reschedule message`);
      return;
    }

    const { subject, body } = MessageTemplates.generateRescheduleMessage(appointment, oldDateTime);
    
    // Send email if available
    if (appointment.email) {
      await this.sendMessage({
        to: appointment.email,
        subject,
        body,
        type: 'email',
        appointmentId: appointment.id,
        eventType: 'reschedule'
      });
    }

    // Send SMS if phone available
    if (appointment.phoneNumber) {
      await this.sendMessage({
        to: appointment.phoneNumber,
        subject,
        body,
        type: 'sms',
        appointmentId: appointment.id,
        eventType: 'reschedule'
      });
    }

    if (!appointment.email && !appointment.phoneNumber) {
      console.log(`⚠️  No email or phone provided for appointment ${appointment.id}, skipping reschedule message`);
    }
  }

  /**
   * Send appointment cancellation message (email or SMS)
   */
  async sendCancellationMessage(appointment: Appointment): Promise<void> {
    if (!appointment.id) {
      console.log(`⚠️  No ID provided for appointment, skipping cancellation message`);
      return;
    }

    const { subject, body } = MessageTemplates.generateCancellationMessage(appointment);
    
    // Send email if available
    if (appointment.email) {
      await this.sendMessage({
        to: appointment.email,
        subject,
        body,
        type: 'email',
        appointmentId: appointment.id,
        eventType: 'cancellation'
      });
    }

    // Send SMS if phone available
    if (appointment.phoneNumber) {
      await this.sendMessage({
        to: appointment.phoneNumber,
        subject,
        body,
        type: 'sms',
        appointmentId: appointment.id,
        eventType: 'cancellation'
      });
    }

    if (!appointment.email && !appointment.phoneNumber) {
      console.log(`⚠️  No email or phone provided for appointment ${appointment.id}, skipping cancellation message`);
    }
  }

  /**
   * Send message via Zapier webhook (email or SMS)
   */
  private async sendMessage(messageData: {
    to: string;
    subject: string;
    body: string;
    type: 'email' | 'sms';
    appointmentId: string;
    eventType: string;
  }): Promise<void> {
    try {
      const messageType = messageData.type === 'email' ? 'email' : 'SMS';
      console.log(`📱 Sending ${messageData.eventType} ${messageType} to ${messageData.to} for appointment ${messageData.appointmentId}`);

      const response = await axios.post(this.zapierWebhookUrl, {
        ...messageData,
        timestamp: new Date().toISOString(),
        source: 'medme-appointment-system'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      console.log(`✅ ${messageData.eventType} ${messageType} sent successfully:`, {
        to: messageData.to,
        subject: messageData.subject,
        appointmentId: messageData.appointmentId,
        type: messageData.type,
        zapierStatus: response.status,
        zapierResponse: response.data
      });

    } catch (error: any) {
      const messageType = messageData.type === 'email' ? 'email' : 'SMS';
      console.error(`❌ Failed to send ${messageData.eventType} ${messageType}:`, {
        to: messageData.to,
        subject: messageData.subject,
        appointmentId: messageData.appointmentId,
        type: messageData.type,
        error: error.message,
        zapierError: error.response?.data
      });
      
      // Don't throw error - message failures shouldn't break appointment operations
      // In production, you might want to queue for retry or send to a dead letter queue
    }
  }
}
