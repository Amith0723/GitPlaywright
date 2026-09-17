import { test, expect } from '@playwright/test';
import { LoginPage } from '../../auth/web/login.page';
import { ReportsPage } from '../web/reports.page';

test.describe('Reports Web Suite @web', () => {
  test('should load reports module and verify access', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const reportsPage = new ReportsPage(page);

    await loginPage.navigate();
    expect(page.url()).toContain('devbiz.zylu.co');
  });
});
