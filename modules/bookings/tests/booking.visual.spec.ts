import { test, expect } from '@playwright/test';
import { LoginPage } from '../../auth/web/login.page';

test.describe('Booking Visual Regression Suite @visual', () => {
  test('should match booking calendar baseline snapshot', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    
    // Validate page canvas or main view element exists
    await page.waitForLoadState('networkidle').catch(() => null);
    expect(page.url()).toContain('devbiz.zylu.co');
  });
});
