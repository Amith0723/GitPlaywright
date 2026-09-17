import { Page, Locator } from '@playwright/test';

export class GlobalNavbar {
  readonly page: Page;
  readonly newSaleButton: Locator;
  readonly reportsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newSaleButton = page.getByRole('button', { name: 'New Sale', exact: true });
    this.reportsButton = page.getByRole('button', { name: 'Reports', exact: true });
  }

  async clickNewSale(): Promise<void> {
    await this.newSaleButton.click({ force: true });
  }

  async clickReports(): Promise<void> {
    await this.reportsButton.click({ force: true });
  }
}
