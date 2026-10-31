import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:5184', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 1000 }
      }
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        viewport: { width: 375, height: 812 }
      }
    }
  ],
  webServer: [
    {
      command: 'node tools/serve.mjs stats 5184',
      url: 'http://127.0.0.1:5184',
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'node tools/serve.mjs admin 5183',
      url: 'http://127.0.0.1:5183',
      reuseExistingServer: !process.env.CI
    }
  ]
})
