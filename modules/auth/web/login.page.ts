import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../../src/core/web/base-page';

export class LoginPage extends BasePage {
  readonly emailTab: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailTab = page.locator('button').filter({ hasText: /^Email & Password$/i }).first();
    this.emailInput = page.locator('#email').or(page.getByRole('textbox', { name: 'Email Address' })).first();
    this.passwordInput = page.locator('#password').or(page.getByRole('textbox', { name: 'Password' })).first();
    this.submitButton = page.locator('#loginForm button[type="submit"]').or(page.getByRole('button', { name: 'Sign In' })).first();
  }

  async navigate(url = 'https://devbiz.zylu.co/') {
    await this.goto(url);
  }

  async login(email = 'test_automation_owner@zylu.co', password = 'mt@0Ho6~vn4b') {
    await this.navigate();
    if (await this.emailTab.isVisible().catch(() => false)) {
      await this.emailTab.click().catch(() => {});
    }
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForURL('**/#/home', { timeout: 30000 });
  }
}
