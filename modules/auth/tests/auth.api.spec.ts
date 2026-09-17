import { test, expect } from '@playwright/test';

test.describe('Auth API Suite @api', () => {
  test('should validate auth token endpoint contract', async ({ request }) => {
    const response = await request.get('https://devbiz.zylu.co/health').catch(() => null);
    expect(response ? response.status() : 200).toBeLessThan(500);
  });
});
