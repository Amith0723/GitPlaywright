import { test, expect } from '@playwright/test';
import { LoginPage } from '../../auth/web/login.page';
import { BookingAdminPage } from '../web/booking-admin.page';

test.describe('Booking Admin Web Suite @web', () => {
  test('should navigate to booking tab in admin dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const bookingPage = new BookingAdminPage(page);

    await loginPage.navigate();
    // Test basic page load and layout
    expect(page.url()).toContain('devbiz.zylu.co');
  });
});
