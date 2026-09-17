import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path = ''): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForVisible(locator: Locator, timeout = 15000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  async safeClick(locator: Locator, timeout = 10000): Promise<void> {
    await locator.waitFor({ state: 'attached', timeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ force: true });
  }

  async safeFill(locator: Locator, text: string, timeout = 10000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.fill(text);
  }

  async typeClean(locator: Locator, text: string): Promise<void> {
    await locator.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await locator.fill(text);
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }
}
