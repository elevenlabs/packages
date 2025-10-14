const { TestEnvironment } = require('jest-environment-node');
const { resolve } = require('path');
const os = require('os');
const fs = require('fs');
const dotenv = require('dotenv');

class CustomTestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);

    // Load .env file from the project root
    const envPath = resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.config({ path: envPath });
      if (envConfig.parsed && envConfig.parsed.ELEVENLABS_API_KEY) {
        process.env.ELEVENLABS_API_KEY = envConfig.parsed.ELEVENLABS_API_KEY;
      }
    }

    // Create a safe working directory
    const testWorkDir = resolve(os.tmpdir(), 'agents-cli-test-wd');
    if (!fs.existsSync(testWorkDir)) {
      fs.mkdirSync(testWorkDir, { recursive: true });
    }

    // Change to the test working directory
    try {
      process.chdir(testWorkDir);
    } catch (error) {
      // Ignore errors changing directory
    }

    // Store the original process.cwd method
    const originalCwd = process.cwd;

    // Override process.cwd to handle ENOENT errors
    process.cwd = function() {
      try {
        return originalCwd.call(this);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return testWorkDir;
        }
        throw error;
      }
    };

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.TEST_TEMP_DIR = testWorkDir;
    // Disable keytar in tests to avoid keychain issues
    process.env.CI = 'true';
  }

  async setup() {
    await super.setup();
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = CustomTestEnvironment;