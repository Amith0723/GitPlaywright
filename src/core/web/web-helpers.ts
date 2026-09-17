import { Page } from '@playwright/test';

export class WebHelpers {
  static async clickCoordinates(page: Page, x: number, y: number): Promise<void> {
    await page.mouse.click(x, y);
  }

  static async scrollDown(page: Page, deltaY = 400, steps = 5): Promise<void> {
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, deltaY);
      await page.waitForTimeout(100);
    }
  }

  static async injectStorageState(page: Page, storageStatePath: string): Promise<void> {
    await page.context().storageState({ path: storageStatePath });
  }
}
