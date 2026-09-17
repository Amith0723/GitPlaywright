import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../../src/core/web/base-page';

export class InventoryGridPage extends BasePage {
  readonly searchInput: Locator;
  readonly addItemBtn: Locator;
  readonly itemsTable: Locator;
  readonly saveBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search products or services...').or(page.locator('input[type="search"]')).first();
    this.addItemBtn = page.getByRole('button', { name: 'Add Item' }).or(page.locator('flt-semantics[role="button"]').filter({ hasText: /Add Item/i })).first();
    this.itemsTable = page.locator('table, [role="grid"], flt-semantics[role="table"]').first();
    this.saveBtn = page.getByRole('button', { name: 'Save' }).first();
  }

  async searchItem(query: string) {
    await this.safeFill(this.searchInput, query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async openAddItemModal() {
    await this.safeClick(this.addItemBtn);
  }
}
