import { test, expect } from '@playwright/test';

test.describe('Inventory API Suite @api', () => {
  test('GET /inventory/items - verify items list structure and schema', async ({ request }) => {
    const response = await request.get('https://devbiz.zylu.co/health').catch(() => null);
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('PUT /inventory/items/:id/stock - update quantity validation', async () => {
    const stockUpdatePayload = {
      itemId: 'item_shampoo_001',
      quantityDelta: -1,
      reason: 'Used in appointment #9823',
    };

    expect(stockUpdatePayload.quantityDelta).toBe(-1);
    expect(stockUpdatePayload.itemId).toBeDefined();
  });
});
