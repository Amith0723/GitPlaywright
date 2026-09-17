export const BaseConfig = {
  defaultTimeout: 30000,
  navigationTimeout: 45000,
  expectTimeout: 10000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  logLevel: process.env.LOG_LEVEL || 'info',
};
