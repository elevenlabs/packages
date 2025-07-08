// Test setup for React Native SDK tests
// This file is loaded before all tests run

// Mock console methods if needed for cleaner test output
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  // Suppress specific warnings during tests
  const message = args[0];
  if (
    typeof message === "string" &&
    message.includes("Failed to parse received data")
  ) {
    return; // Suppress expected warnings in tests
  }
  originalConsoleWarn(...args);
};

// Ensure fetch is available globally for tests
if (!globalThis.fetch) {
  globalThis.fetch = jest.fn();
}

// Add any other global test setup here
export {};
