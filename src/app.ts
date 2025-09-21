import Fastify from 'fastify';
import { ScheduleHandlers } from './handlers/ScheduleHandlers';
import { AppointmentService } from './services/appointmentService';
import { CalendarService } from './services/calendarService';
import { IAppointmentService } from './services/interfaces/IAppointmentService';
import { ICalendarService } from './services/interfaces/ICalendarService';
import { PostgresAppointmentRepository } from './repositories/postgresAppointmentRepository';
import { IAppointmentRepository } from './repositories/interfaces/IAppointmentRepository';
import { scheduleRoutes } from './routes/scheduleRoutes';
import { calendar_v3, auth as gauth } from '@googleapis/calendar';
import path from 'path';

/**
 * Get the current time in UTC
 * @returns Date object representing the current UTC time
 */
export function getCurrentTimeUTC(): Date {
  return new Date();
}

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: 'info'
    }
  });

  // Check environment variables
  console.log('🔑 Checking Database environment variables...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
  
  // Instantiate dependencies
  const appointmentRepository: IAppointmentRepository = new PostgresAppointmentRepository();
  
  // Service Account Authentication (without domain delegation)
  const authClient = new gauth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL!,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.events.freebusy',
      'https://www.googleapis.com/auth/calendar.freebusy'
    ],
  });
  
  const googleCalendarClient = new calendar_v3.Calendar({ auth: authClient });

  const calendarService: ICalendarService = new CalendarService(
    {
      primaryCalendarId: process.env.GOOGLE_PRIMARY_CALENDAR_ID || 'primary',
      rangeDays: Number(process.env.GOOGLE_FREEBUSY_RANGE_DAYS || 7),
    },
    googleCalendarClient
  );
  const appointmentService: IAppointmentService = new AppointmentService(appointmentRepository, calendarService);


  // Create handler instances
  const scheduleHandlers = new ScheduleHandlers(appointmentService, calendarService);

  // Register all routes (including webhook)
  await fastify.register(scheduleRoutes, { 
    scheduleHandlers 
  });

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Serve demo page
  fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '..', 'demo'),
    prefix: '/demo/',
  });

  // Demo redirect
  fastify.get('/demo', async (request, reply) => {
    return reply.redirect('/demo/');
  });

  return fastify;
}
