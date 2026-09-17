import { defineConfig, devices } from '@playwright/test';
import { DevConfig } from './env.dev';

export default defineConfig({
  testDir: '../',
  testIgnore: ['**/*.flutter.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: DevConfig.retries,
  workers: DevConfig.workers,
  reporter: [['html', { outputFolder: '../playwright-report' }], ['list']],
  use: {
    baseURL: DevConfig.webUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'web-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        /.*\.web\.spec\.ts$/,
        /(^|[\\\/])tests[\\\/].*\.spec\.[jt]s$/,
      ],
      testIgnore: [
        '**/*.api.spec.ts',
        '**/*.cross.spec.ts',
        '**/*.visual.spec.ts',
        '**/*.flutter.spec.ts',
      ],
    },
    {
      name: 'api',
      use: { baseURL: DevConfig.apiUrl },
      testMatch: [/.*\.api\.spec\.ts$/],
      testIgnore: ['**/*.flutter.spec.ts'],
    },
    {
      name: 'cross-system',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [/.*\.cross\.spec\.ts$/],
      testIgnore: ['**/*.flutter.spec.ts'],
    },
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [/.*\.visual\.spec\.ts$/],
      testIgnore: ['**/*.flutter.spec.ts'],
    },
  ],
});
