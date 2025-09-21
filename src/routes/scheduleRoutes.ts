import { FastifyInstance } from 'fastify';
import { ScheduleHandlers } from '../handlers/ScheduleHandlers';

export async function scheduleRoutes(fastify: FastifyInstance, { scheduleHandlers }: { scheduleHandlers: ScheduleHandlers }) {
  // Retell webhook route
  fastify.post('/retell-webhook', scheduleHandlers.handleRetellWebhook);
}
