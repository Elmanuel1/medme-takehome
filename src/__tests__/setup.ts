// Global test setup and mocks

// Mock external SDKs and services
jest.mock('retell-sdk', () => ({
  Retell: {
    verify: jest.fn()
  }
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      lt: jest.fn(),
      gt: jest.fn(),
      neq: jest.fn(),
      in: jest.fn(),
      order: jest.fn(),
      single: jest.fn()
    }))
  }))
}));

jest.mock('@googleapis/calendar', () => ({
  calendar_v3: {
    Calendar: jest.fn()
  },
  auth: {
    GoogleAuth: jest.fn()
  }
}));
