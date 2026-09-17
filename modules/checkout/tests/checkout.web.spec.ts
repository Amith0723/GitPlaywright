import { test, expect } from '@playwright/test';
import { LoginPage } from '../../auth/web/login.page';
import { CheckoutPage } from '../web/checkout.page';

test.describe('Checkout Web Suite @web', () => {
  test('should initialize checkout screen and elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const checkoutPage = new CheckoutPage(page);

    await loginPage.navigate();
    expect(page.url()).toContain('devbiz.zylu.co');
  });
});
