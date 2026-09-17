// @ts-check
import { expect } from '@playwright/test';

export class CheckoutPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async proceedToCheckout() {
    console.log('8. Proceeding to Checkout...');
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(800);

    const checkoutButton = this.page.locator('flt-semantics[role="button"]').filter({ hasText: /^Checkout$/i })
      .or(this.page.getByRole('button', { name: 'Checkout', exact: true }))
      .or(this.page.getByText('Checkout', { exact: true }))
      .first();

    await checkoutButton.waitFor({ state: 'attached', timeout: 15000 });
    await checkoutButton.scrollIntoViewIfNeeded().catch(() => {});
    await checkoutButton.click({ force: true });
    console.log('✅ Clicked Checkout button');
    await this.page.waitForTimeout(3000);
  }

  async getPaymentDue() {
    return await this.page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
      for (const el of allElements) {
        const t = (el.textContent || '').trim();
        const m = t.match(/Payment Due[\s\n]*₹?([\d,]+(?:\.\d+)?)/i);
        if (m) {
          const val = parseFloat(m[1].replace(/,/g, ''));
          if (!isNaN(val) && val > 0) return val;
        }
      }
      for (const el of allElements) {
        const t = (el.textContent || '').trim();
        const m = t.match(/TOTAL[:\s\n]*₹?([\d,]+(?:\.\d+)?)/i);
        if (m) {
          const val = parseFloat(m[1].replace(/,/g, ''));
          if (!isNaN(val) && val > 0) return val;
        }
      }
      return 0;
    });
  }

  async setPaymentAmount(method, amount) {
    console.log(`   Entering payment amount for "${method}": ₹${amount}`);
    const target = await this.page.evaluate(({ method }) => {
      const allElements = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
      const dueEl = allElements.find(el => (el.textContent || '').trim().startsWith('Payment Due'));
      const minTop = dueEl ? dueEl.getBoundingClientRect().top : 350;

      const labelEl = allElements.find(el => {
        const t = (el.textContent || '').trim();
        const r = el.getBoundingClientRect();
        return t === method && r.top > minTop && r.left < 400 && r.width > 0;
      }) || allElements.find(el => (el.textContent || '').trim() === method);

      if (!labelEl) return null;
      const lRect = labelEl.getBoundingClientRect();

      const inputs = Array.from(document.querySelectorAll('input[data-semantics-role="text-field"], input[aria-label="Amount"], input[type="text"], input'))
        .map(inp => {
          const r = inp.getBoundingClientRect();
          return { id: inp.id || inp.closest('flt-semantics')?.id, top: r.top, left: r.left, width: r.width, height: r.height };
        })
        .filter(inp => Math.abs(inp.top - lRect.top) < 45 && inp.left > lRect.left && inp.left < lRect.left + 280)
        .sort((a, b) => a.left - b.left);

      if (inputs.length > 0) {
        return { id: inputs[0].id, centerX: inputs[0].left + inputs[0].width / 2, centerY: inputs[0].top + inputs[0].height / 2 };
      }

      const boxes = Array.from(document.querySelectorAll('flt-semantics'))
        .map(s => {
          const r = s.getBoundingClientRect();
          return { id: s.id, top: r.top, left: r.left, width: r.width, height: r.height };
        })
        .filter(s => Math.abs(s.top - lRect.top) < 45 && s.left > lRect.left && s.left < lRect.left + 280 && s.width >= 40 && s.width <= 160 && s.height >= 20 && s.height <= 60)
        .sort((a, b) => a.left - b.left);

      if (boxes.length > 0) {
        return { id: boxes[0].id, centerX: boxes[0].left + boxes[0].width / 2, centerY: boxes[0].top + boxes[0].height / 2 };
      }

      return { id: null, centerX: lRect.right + 70, centerY: lRect.top + lRect.height / 2 };
    }, { method });

    if (!target) throw new Error(`Could not locate payment row for "${method}"`);

    await this.page.mouse.click(target.centerX, target.centerY);
    if (target.id) {
      await this.page.locator(`#${target.id}`).click({ force: true }).catch(() => {});
    }
    await this.page.waitForTimeout(400);

    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.page.keyboard.type(String(amount), { delay: 60 });
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(500);

    console.log(`   ✅ Successfully entered ₹${amount} for "${method}"`);
    return true;
  }

  async handleOptionalPopups(maxPopups = 4) {
    const standardPopupRegex = /^(?:Yes|OK|Confirm|Proceed|Continue|Close|Got it|Done|Skip|Submit|Dismiss|Yes,\s*Proceed|Yes,\s*Complete|Confirm\s*Payment)$/i;

    for (let i = 1; i <= maxPopups; i++) {
      await this.page.waitForTimeout(1000);
      const locatorCandidate = this.page.locator('flt-semantics[role="button"], flt-semantics, button')
        .filter({ hasText: standardPopupRegex })
        .last();

      const isAttached = await locatorCandidate.waitFor({ state: 'attached', timeout: 2500 }).then(() => true).catch(() => false);
      if (isAttached) {
        const text = (await locatorCandidate.textContent().catch(() => ''))?.trim();
        console.log(`✅ Found popup #${i} via locator "${text}" — clicking...`);
        const box = await locatorCandidate.boundingBox().catch(() => null);
        if (box) {
          await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
        await locatorCandidate.click({ force: true, timeout: 2000 }).catch(() => {});
        await this.page.waitForTimeout(2000);
        continue;
      }

      const ratingBtn = this.page.locator('flt-semantics, button, span, div')
        .filter({ hasText: /^(?:Very Satisfied|Satisfied)$/i })
        .first();
      const isRating = await ratingBtn.waitFor({ state: 'attached', timeout: 2000 }).then(() => true).catch(() => false);

      if (isRating) {
        console.log(`⭐ Found experience rating on popup #${i} — selecting rating...`);
        const rBox = await ratingBtn.boundingBox().catch(() => null);
        if (rBox) {
          await this.page.mouse.click(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
        } else {
          await this.page.mouse.click(608, 570);
        }
        await this.page.waitForTimeout(1000);

        const actionBtn = this.page.locator('flt-semantics[role="button"], flt-semantics, button')
          .filter({ hasText: /^(?:Go to Bookings|New Sale)$/i })
          .first();
        const isAction = await actionBtn.waitFor({ state: 'attached', timeout: 2000 }).then(() => true).catch(() => false);
        if (isAction) {
          const aBox = await actionBtn.boundingBox().catch(() => null);
          if (aBox) {
            await this.page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
          }
          await actionBtn.click({ force: true, timeout: 2000 }).catch(() => {});
        }
        await this.page.waitForTimeout(2500);
        continue;
      }
      break;
    }
  }

  async completeSaleAndClose({ maxPopups = 2, closeBrowser = false } = {}) {
    console.log('10. Completing sale...');
    const completeButton = this.page.locator('flt-semantics[role="button"]').filter({ hasText: /^Complete$/i })
      .or(this.page.getByRole('button', { name: /^Complete$/i }))
      .or(this.page.getByText('Complete', { exact: true }))
      .first();

    await completeButton.waitFor({ state: 'attached', timeout: 15000 });
    await completeButton.click({ force: true });
    console.log('✅ Clicked "Complete"');

    console.log('11. Handling confirmation popups...');
    await this.handleOptionalPopups(maxPopups);
    await this.page.waitForTimeout(2000);

    if (closeBrowser) {
      console.log('12. Closing browser context...');
      await this.page.close();
      await this.page.context().close();
    }
  }
}
