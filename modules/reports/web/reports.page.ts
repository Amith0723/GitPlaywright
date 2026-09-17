import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../../src/core/web/base-page';

export class ReportsPage extends BasePage {
  readonly dailyRevenueReportBtn: Locator;
  readonly staffCommissionReportBtn: Locator;
  readonly downloadCsvBtn: Locator;
  readonly downloadPdfBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.dailyRevenueReportBtn = page.getByRole('button', { name: /Daily Revenue/i }).first();
    this.staffCommissionReportBtn = page.getByRole('button', { name: /Staff Commission/i }).first();
    this.downloadCsvBtn = page.getByRole('button', { name: /Download CSV|Export CSV/i }).first();
    this.downloadPdfBtn = page.getByRole('button', { name: /Download PDF|Export PDF/i }).first();
  }

  async openDailyRevenueReport() {
    await this.safeClick(this.dailyRevenueReportBtn);
  }

  async openStaffCommissionReport() {
    await this.safeClick(this.staffCommissionReportBtn);
  }
}
