import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests sequentially for better debugging
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker for debugging
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable debugging features
        launchOptions: {
          slowMo: 100, // Slow down actions for debugging
          devtools: false,
          headless: true // Force headless mode
        }
      },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      port: 3002,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'cd ../backend && npm run start:dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    }
  ],
});