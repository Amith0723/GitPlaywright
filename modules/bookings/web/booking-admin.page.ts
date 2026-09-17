import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../../src/core/web/base-page';

export class BookingAdminPage extends BasePage {
  readonly newSaleBtn: Locator;
  readonly bookingTab: Locator;

  constructor(page: Page) {
    super(page);
    this.newSaleBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^New Sale$/i }).or(page.getByRole('button', { name: 'New Sale', exact: true })).first();
    this.bookingTab = page.getByRole('tab', { name: 'Booking' }).or(page.locator('flt-semantics[role="tab"]').filter({ hasText: /^Booking$/i })).first();
  }

  async openBookingTab() {
    await this.safeClick(this.newSaleBtn);
    await this.page.waitForTimeout(1500);
    await this.safeClick(this.bookingTab);
  }
}
