import { ScheduleHandlers } from '../../handlers/ScheduleHandlers';
import { IAppointmentService } from '../../services/interfaces/IAppointmentService';
import { ICalendarService } from '../../services/interfaces/ICalendarService';
import { BusySlot } from '../../types/schedule';

// Mock FastifyReply
const mockReply = {
  code: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis()
};

// Mock services
const mockAppointmentService: jest.Mocked<IAppointmentService> = {
  createAppointment: jest.fn(),
  editAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
  getActiveAppointmentsByEmailOrPhone: jest.fn()
};

const mockCalendarService: jest.Mocked<ICalendarService> = {
  getBookedSlotsForDate: jest.fn(),
  createCalendarEvent: jest.fn(),
  updateCalendarEvent: jest.fn(),
  deleteCalendarEvent: jest.fn()
};

describe('ScheduleHandlers', () => {
  let scheduleHandlers: ScheduleHandlers;

  beforeEach(() => {
    scheduleHandlers = new ScheduleHandlers(mockAppointmentService, mockCalendarService);
    jest.clearAllMocks();
    mockReply.code.mockReturnThis();
    mockReply.send.mockReturnThis();
  });

  describe('handleCheckBookedSlots - Availability Check', () => {
    const sampleBookedSlots: BusySlot[] = [
      {"start": new Date("2025-09-21T16:00:00.000Z"), "end": new Date("2025-09-21T16:30:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-21T17:00:00.000Z"), "end": new Date("2025-09-21T18:30:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-21T21:00:00.000Z"), "end": new Date("2025-09-21T22:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-22T04:00:00.000Z"), "end": new Date("2025-09-22T05:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-22T15:00:00.000Z"), "end": new Date("2025-09-22T16:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-22T17:00:00.000Z"), "end": new Date("2025-09-22T17:30:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-22T18:00:00.000Z"), "end": new Date("2025-09-22T19:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-22T21:00:00.000Z"), "end": new Date("2025-09-22T22:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-23T00:00:00.000Z"), "end": new Date("2025-09-23T01:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-23T15:00:00.000Z"), "end": new Date("2025-09-23T15:30:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-23T17:00:00.000Z"), "end": new Date("2025-09-23T17:30:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-23T23:00:00.000Z"), "end": new Date("2025-09-24T00:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-25T15:00:00.000Z"), "end": new Date("2025-09-25T16:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-25T19:00:00.000Z"), "end": new Date("2025-09-25T20:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-26T22:00:00.000Z"), "end": new Date("2025-09-26T23:00:00.000Z"), "isAvailable": false},
      {"start": new Date("2025-09-28T00:00:00.000Z"), "end": new Date("2025-09-28T00:30:00.000Z"), "isAvailable": false}
    ];

    beforeEach(() => {
      mockCalendarService.getBookedSlotsForDate.mockResolvedValue(sampleBookedSlots);
    });

    it('should return available=false when dateStr falls within a booked slot (PDT timezone conversion)', async () => {
      // 2025-09-21T14:00:00-07:00 (PDT) converts to 2025-09-21T21:00:00.000Z (UTC)
      // This should match the slot: 2025-09-21T21:00:00.000Z to 2025-09-21T22:00:00.000Z
      const args = {
        dateStr: '2025-09-21T14:00:00-07:00'
      };
      const call = {};

      await (scheduleHandlers as any).handleCheckBookedSlots(call, args, mockReply);

      expect(mockCalendarService.getBookedSlotsForDate).toHaveBeenCalledWith(new Date('2025-09-21T14:00:00-07:00'));
      expect(mockReply.send).toHaveBeenCalledWith({
        success: "true",
        bookedSlots: sampleBookedSlots,
        available: false // Should be false because it falls within 21:00-22:00 UTC slot
      });
    });

    it('should return available=true when dateStr does not fall within any booked slot', async () => {
      const args = {
        dateStr: '2025-09-21T12:00:00.000Z' // This time doesn't conflict with any slot
      };
      const call = {};

      await (scheduleHandlers as any).handleCheckBookedSlots(call, args, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        success: "true",
        bookedSlots: sampleBookedSlots,
        available: true
      });
    });

    it('should return available=false when dateStr exactly matches slot start time', async () => {
      const args = {
        dateStr: '2025-09-21T16:00:00.000Z' // Exact start time of first slot
      };
      const call = {};

      await (scheduleHandlers as any).handleCheckBookedSlots(call, args, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        success: "true",
        bookedSlots: sampleBookedSlots,
        available: false
      });
    });

    it('should return available=true when dateStr equals slot end time (exclusive)', async () => {
      const args = {
        dateStr: '2025-09-21T16:30:00.000Z' // Exact end time of first slot (should be available)
      };
      const call = {};

      await (scheduleHandlers as any).handleCheckBookedSlots(call, args, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        success: "true",
        bookedSlots: sampleBookedSlots,
        available: true // End time is exclusive, so this should be available
      });
    });

    it('should return available=false when dateStr falls in the middle of a long slot', async () => {
      const args = {
        dateStr: '2025-09-21T17:45:00.000Z' // Middle of 17:00-18:30 slot
      };
      const call = {};

      await (scheduleHandlers as any).handleCheckBookedSlots(call, args, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        success: "true",
        bookedSlots: sampleBookedSlots,
        available: false
      });
    });

    it('should handle invalid dateStr with error response', async () => {
      const args = {
        dateStr: 'invalid-date'
      };
      const call = {};

      await (scheduleHandlers as any).handleCheckBookedSlots(call, args, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        code: 'INVALID_DATE',
        message: 'Invalid date string: invalid-date'
      });
    });

    it('should handle missing dateStr with error response', async () => {
      const args = {};
      const call = {};

      await (scheduleHandlers as any).handleCheckBookedSlots(call, args, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        code: 'INVALID_DATE',
        message: 'dateStr is required and must be a valid date string'
      });
    });
  });
});
