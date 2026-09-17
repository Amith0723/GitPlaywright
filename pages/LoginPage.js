// @ts-check
import { expect } from '@playwright/test';

export class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.emailTab = page.locator('button').filter({ hasText: /^Email & Password$/i }).first();
    this.emailInput = page.locator('#email').or(page.getByRole('textbox', { name: 'Email Address' })).first();
    this.passwordInput = page.locator('#password').or(page.getByRole('textbox', { name: 'Password' })).first();
    this.submitButton = page.locator('#loginForm button[type="submit"]')
      .or(page.locator('//*[@id="loginForm"]/button'))
      .or(page.getByRole('button', { name: 'Sign In' }))
      .first();
  }

  async goto() {
    await this.page.goto('https://devbiz.zylu.co/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isSessionActive() {
    const isHome = await this.page.waitForURL('**/#/home', { timeout: 3500 }).then(() => true).catch(() => false);
    return isHome || this.page.url().includes('#/home');
  }

  async login({
    email = 'test_automation_owner@zylu.co',
    password = 'mt@0Ho6~vn4b'
  } = {}) {
    console.log('1. Logging in...');
    await this.goto();

    if (await this.emailTab.isVisible().catch(() => false)) {
      await this.emailTab.click().catch(() => {});
      await this.page.waitForTimeout(300);
    }

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.page.waitForURL('**/#/home', { timeout: 15000 });
        console.log('✅ Logged in successfully');
        return;
      } catch {
        const loginFailed = this.page.locator('text=Login Failed, text=Failed to fetch').first();
        if (await loginFailed.isVisible().catch(() => false)) {
          console.log('⚠️ Transient "Login Failed" encountered, retrying submit...');
          await this.page.waitForTimeout(2000);
          await this.submitButton.click().catch(() => {});
        }
      }
    }

    await this.page.waitForURL('**/#/home', { timeout: 30000 });
    console.log('✅ Logged in successfully');
  }
}
