import { test as base } from '@playwright/test';

export const cleanerFixture = base.extend<{ stateCleaner: (cleanFn: () => Promise<void>) => void }>({
  stateCleaner: async ({}, use) => {
    const cleanups: (() => Promise<void>)[] = [];
    await use((fn) => cleanups.push(fn));
    for (const cleanup of cleanups) {
      await cleanup().catch((e) => console.warn('Cleanup error: ', e));
    }
  },
});
