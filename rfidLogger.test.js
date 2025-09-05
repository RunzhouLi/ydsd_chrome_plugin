// Jest test for RFID Logger module
// Run with: npx jest rfidLogger.test.js

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        callback({ rfidLoggerEnabled: true });
      })
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// Mock DOM
global.document = {
  readyState: 'complete',
  addEventListener: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  querySelector: jest.fn(() => null),
  createElement: jest.fn(() => ({
    setAttribute: jest.fn(),
    click: jest.fn(),
    style: {}
  }))
};

global.window = {
  location: {
    href: 'http://test.com'
  },
  msgQueue: []
};

global.navigator = {
  userAgent: 'test-agent'
};

// Load the script
require('./rfidLogger.js');

describe('RFID Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
  });

  test('should initialize with enabled state', () => {
    expect(global.chrome.storage.sync.get).toHaveBeenCalledWith(
      { rfidLoggerEnabled: true }, 
      expect.any(Function)
    );
  });

  test('should expose global rfidLogger object', () => {
    expect(window.rfidLogger).toBeDefined();
    expect(typeof window.rfidLogger.isEnabled).toBe('function');
    expect(typeof window.rfidLogger.downloadLogs).toBe('function');
    expect(typeof window.rfidLogger.getLogs).toBe('function');
  });

  test('should return enabled state', () => {
    expect(window.rfidLogger.isEnabled()).toBe(true);
  });

  test('should get logs from localStorage', () => {
    const mockLogs = [{ timestamp: '2023-01-01', orderNumber: 'TEST-001' }];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLogs));
    
    const logs = window.rfidLogger.getLogs();
    expect(logs).toEqual(mockLogs);
  });

  test('should handle empty logs gracefully', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const logs = window.rfidLogger.getLogs();
    expect(logs).toEqual([]);
  });
});