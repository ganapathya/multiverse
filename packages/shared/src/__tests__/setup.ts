// Mock chrome.storage for testing
const mockStorage = {
  sync: {
    data: {} as Record<string, unknown>,
    get: vi.fn().mockImplementation((keys: string[] | null) => {
      if (!keys) return Promise.resolve(mockStorage.sync.data);
      const result: Record<string, unknown> = {};
      if (Array.isArray(keys)) {
        keys.forEach((key) => {
          if (key in mockStorage.sync.data) {
            result[key] = mockStorage.sync.data[key];
          }
        });
      }
      return Promise.resolve(result);
    }),
    set: vi.fn().mockImplementation((items: Record<string, unknown>) => {
      Object.assign(mockStorage.sync.data, items);
      return Promise.resolve();
    }),
    remove: vi.fn().mockImplementation((keys: string[]) => {
      keys.forEach((key) => delete mockStorage.sync.data[key]);
      return Promise.resolve();
    }),
    clear: vi.fn().mockImplementation(() => {
      mockStorage.sync.data = {};
      return Promise.resolve();
    }),
  },
  local: {
    data: {} as Record<string, unknown>,
    get: vi.fn().mockImplementation((keys: string[] | null) => {
      if (!keys) return Promise.resolve(mockStorage.local.data);
      const result: Record<string, unknown> = {};
      if (Array.isArray(keys)) {
        keys.forEach((key) => {
          if (key in mockStorage.local.data) {
            result[key] = mockStorage.local.data[key];
          }
        });
      }
      return Promise.resolve(result);
    }),
    set: vi.fn().mockImplementation((items: Record<string, unknown>) => {
      Object.assign(mockStorage.local.data, items);
      return Promise.resolve();
    }),
    remove: vi.fn().mockImplementation((keys: string[]) => {
      keys.forEach((key) => delete mockStorage.local.data[key]);
      return Promise.resolve();
    }),
    clear: vi.fn().mockImplementation(() => {
      mockStorage.local.data = {};
      return Promise.resolve();
    }),
  },
};

// Mock chrome global
Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: mockStorage,
  },
  writable: true,
});

// Reset storage before each test
beforeEach(() => {
  mockStorage.sync.data = {};
  mockStorage.local.data = {};
  vi.clearAllMocks();
});

// Export for use in tests
export { mockStorage };
