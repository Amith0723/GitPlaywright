import { test } from '@playwright/test';
import { login, openNewSaleBooking, selectCustomer } from '../../utils/helpers.js';

test('Dump DOM inside Products modal', async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  await openNewSaleBooking(page);
  await selectCustomer(page, { query: 'r', index: 0 });
  await page.waitForTimeout(2000);

  const prodBtn = page.getByRole('button', { name: /Product/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /Product/i }))
    .first();
  await prodBtn.waitFor({ state: 'attached', timeout: 10000 });
  await prodBtn.click({ force: true });
  await page.waitForTimeout(3000);

  const dump = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).map(el => {
      const tag = el.tagName;
      const role = el.getAttribute('role');
      const aria = el.getAttribute('aria-label');
      const text = (el.textContent || '').trim().slice(0, 60);
      const r = el.getBoundingClientRect();
      return { tag, role, aria, text, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    }).filter(e => (e.aria || e.text) && e.w > 0 && e.h > 0 && (e.text.includes('Stock') || e.aria?.includes('Stock') || e.role === 'checkbox'));
  });

  console.log('Filtered Elements matching Stock or checkbox:', JSON.stringify(dump, null, 2));
});
