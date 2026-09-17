import { Page, Locator } from '@playwright/test';

export class ConfirmationModal {
  readonly page: Page;
  readonly yesButton: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.yesButton = page.getByRole('button', { name: /^Yes$/i });
    this.continueButton = page.getByRole('button', { name: /^Continue$/i });
  }

  async confirmYes(): Promise<void> {
    if (await this.yesButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.yesButton.click({ force: true });
    }
  }
}
