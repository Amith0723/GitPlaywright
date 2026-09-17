import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../../src/core/web/base-page';

export class CheckoutPage extends BasePage {
  readonly addTipBtn: Locator;
  readonly applyCouponBtn: Locator;
  readonly payNowBtn: Locator;
  readonly cashOptionBtn: Locator;
  readonly paymentSuccessMsg: Locator;

  constructor(page: Page) {
    super(page);
    this.addTipBtn = page.getByRole('button', { name: /Tip/i }).or(page.locator('flt-semantics[role="button"]').filter({ hasText: /Tip/i })).first();
    this.applyCouponBtn = page.getByRole('button', { name: /Coupon|Discount/i }).first();
    this.payNowBtn = page.getByRole('button', { name: /Pay|Collect/i }).first();
    this.cashOptionBtn = page.getByRole('button', { name: /Cash/i }).first();
    this.paymentSuccessMsg = page.getByText(/Payment successful|Completed/i).first();
  }

  async selectCashPayment() {
    await this.safeClick(this.cashOptionBtn);
  }

  async completeCheckout() {
    await this.safeClick(this.payNowBtn);
  }
}
