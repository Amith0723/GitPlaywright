import { test, expect } from '@playwright/test';
import { LoginPage } from '../web/login.page';

test.describe('Auth Web Suite @web', () => {
  test('should login successfully to Zylu application', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login();
    expect(page.url()).toContain('#/home');
  });
});
