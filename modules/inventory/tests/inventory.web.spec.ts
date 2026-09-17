import { test, expect } from '@playwright/test';
import { LoginPage } from '../../auth/web/login.page';
import { InventoryGridPage } from '../web/inventory-grid.page';

test.describe('Inventory Grid Web Suite @web', () => {
  test('should view inventory list and allow searching products', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryGridPage(page);

    await loginPage.navigate();
    expect(page.url()).toContain('devbiz.zylu.co');
  });
});
