module.exports = {
  // Use React Native preset optimized for TypeScript
  preset: 'ts-jest',

  // Use node environment with React Native globals
  testEnvironment: 'node',

  // Define test roots
  roots: ['<rootDir>/src'],

  // Enhanced test file matching patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).+(ts|tsx|js|jsx)',
    '**/*.(test|spec).+(ts|tsx|js|jsx)',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],

  // TypeScript and JavaScript transformation
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      isolatedModules: true,
      useESM: false,
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs',
        moduleResolution: 'node',
        allowJs: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        strict: false, // Relaxed for testing
        resolveJsonModule: true,
      },
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // File extensions to handle
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
    'ios.ts',
    'ios.tsx',
    'android.ts',
    'android.tsx',
    'native.ts',
    'native.tsx',
  ],

  // Minimal module mapping for React Native modules
  moduleNameMapper: {
    '^react-native$': '<rootDir>/jest.rn-mock.js',
    '^react-native/(.*)$': '<rootDir>/jest.rn-mock.js',
  },

  // Setup files
  setupFiles: [],

  // Setup files after environment is set up
  setupFilesAfterEnv: [],

  // Coverage configuration
  collectCoverage: false, // Enable manually with --coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/test-*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!**/node_modules/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Per-file thresholds for critical files
    './src/conversation.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/errors.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Ignore patterns for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.next/',
    '/coverage/',
    '\\.d\\.ts$',
    '\\.test\\.ts$',
    '\\.spec\\.ts$',
  ],

  // Test timeout (increased for React Native)
  testTimeout: 15000,

  // Clear mocks after each test
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Reset modules before each test
  resetModules: false, // Keep false for performance

  // Verbose output
  verbose: false, // Set to true for debugging

  // Error handling
  errorOnDeprecated: true,

  // Performance optimizations
  maxWorkers: '50%', // Use half the available CPU cores

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '\\.git/',
  ],

  // Test result processing
  testResultsProcessor: undefined,

  // Custom environment variables for React Native
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // Resolver configuration for React Native modules
  resolver: undefined, // Use default resolver with moduleNameMapping

  // Transform ignore patterns (important for React Native)
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@livekit|livekit-client)/)',
  ],

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
  ],

  // Global setup and teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Custom reporters
  reporters: [
    'default',
    // Add custom reporters here if needed
    // ['jest-junit', { outputDirectory: 'test-results', outputName: 'junit.xml' }],
  ],

  // Snapshot configuration
  snapshotSerializers: [],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],

  // Silent mode
  silent: false,

  // Notify configuration
  notify: false,
  notifyMode: 'failure-change',

  // Force exit
  forceExit: false,

  // Detect open handles
  detectOpenHandles: false, // Set to true for debugging

  // Detect leaked handles
  detectLeaks: false, // Set to true for debugging

  // Bail configuration
  bail: 0, // Run all tests

  // Collect coverage from untested files
  // collectCoverageOnlyFrom removed - replaced by collectCoverageFrom

  // Coverage provider
  coverageProvider: 'v8', // Faster than babel

  // Extensions to ignore
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],

  // Project configuration for monorepo support
  projects: undefined,

  // Runner configuration
  runner: 'jest-runner',

  // Test name pattern
  testNamePattern: undefined,

  // Only changed files
  onlyChanged: false,

  // Pass with no tests
  passWithNoTests: true,

  // Use stderr
  useStderr: false,

  // Watch plugins
  watchPlugins: [
    // Removed jest-watch-typeahead plugins - not installed
  ],

  // Timezone
  fakeTimers: {
    enableGlobally: false // Use real timers by default
  },
};