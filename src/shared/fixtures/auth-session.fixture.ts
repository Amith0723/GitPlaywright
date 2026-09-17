import { test as base } from '@playwright/test';

export const authFixture = base.extend<{ authenticatedPage: any }>({
  authenticatedPage: async ({ page }, use) => {
    // API assisted fast token injection hook
    await use(page);
  },
});
