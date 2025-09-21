import { z } from 'zod';

export enum AppointmentType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  CHECK_UP = 'check_up',
  EMERGENCY = 'emergency',
  VACCINATION = 'vaccination',
  SCREENING = 'screening',
  THERAPY = 'therapy',
  SURGERY = 'surgery',
  DIAGNOSTIC = 'diagnostic',
  PREVENTIVE = 'preventive',
  SPECIALIST = 'specialist',
  ROUTINE = 'routine'
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}


export const ScheduleRequestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email().optional(),
  phoneNumber: z.string().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  type: z.nativeEnum(AppointmentType),
  notes: z.record(z.string(), z.any()).optional().default({}), // JSONB object
  reason: z.string().optional(),
  callId: z.string().optional()
}).refine((data) => data.endAt > data.startAt, {
  message: 'endAt must be after startAt',
  path: ['endAt']
}).refine((data) => data.email || data.phoneNumber, {
  message: 'Either email or phone number must be provided',
  path: ['email', 'phoneNumber']
});

export type ScheduleRequest = z.infer<typeof ScheduleRequestSchema>;

export interface RetellWebhookRequest {
  name: string;
  call: RetellCall;
  args: Record<string, any>;
}

export interface RetellCall {
  call_id: string;
  agent_id: string;
  user_id?: string;
  transcript?: string;
  metadata?: Record<string, any>;
}

export interface Appointment {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  startAt: Date;
  endAt: Date;
  type: AppointmentType;
  notes: Record<string, any>; // JSONB object - stores full Retell call data
  reason?: string;
  status: AppointmentStatus;
  calendarEventId?: string;
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface BusySlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
}

