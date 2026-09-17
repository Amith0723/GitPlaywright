// @ts-check
import { expect } from '@playwright/test';

export class BookingPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async openNewSaleBooking() {
    console.log('2. Opening New Sale & Booking tab...');
    const closeOverlayBtn = this.page.locator('dialog button').first();
    if (await closeOverlayBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeOverlayBtn.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(500);
    }

    const newSaleBtn = this.page.locator('flt-semantics[role="button"]').filter({ hasText: /^New Sale$/i })
      .or(this.page.getByRole('button', { name: 'New Sale', exact: true }))
      .first();

    let isVisible = await newSaleBtn.isVisible().catch(() => false);
    if (!isVisible) {
      console.log('   Scrolling sidebar up to reveal "New Sale"...');
      await this.page.mouse.move(100, 400);
      for (let i = 0; i < 8; i++) {
        await this.page.mouse.wheel(0, -400);
        await this.page.waitForTimeout(150);
      }
      await this.page.waitForTimeout(1000);
    }

    await newSaleBtn.waitFor({ state: 'attached', timeout: 15000 });
    const b = await newSaleBtn.boundingBox().catch(() => null);
    if (b && b.width > 0) {
      await this.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    } else {
      await newSaleBtn.click({ force: true });
    }
    await this.page.waitForTimeout(2000);

    const bookingTab = this.page.getByRole('tab', { name: 'Booking' })
      .or(this.page.locator('flt-semantics[role="tab"]').filter({ hasText: /^Booking$/i }))
      .first();
    if (await bookingTab.isVisible({ timeout: 4000 }).catch(() => false)) {
      await bookingTab.click({ force: true });
      await this.page.waitForTimeout(1500);
      console.log('✅ Switched to Booking tab');
    } else {
      await this.page.mouse.click(100, 316);
      await this.page.waitForTimeout(2000);
      if (await bookingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bookingTab.click({ force: true });
        await this.page.waitForTimeout(1500);
      }
      console.log('✅ Switched to Booking tab');
    }
  }

  async selectCustomer({
    query = 'r',
    index = 0,
    fallbackQueries = ['r', 's', 'm', 'a', 'e']
  } = {}) {
    console.log(`3. Searching customer with query "${query}" (target index: ${index})...`);
    const customerSearchInput = this.page.getByRole('textbox', { name: 'Search Customer' });
    await customerSearchInput.click();
    await this.page.waitForTimeout(500);

    const queriesToTry = [query, ...fallbackQueries.filter(q => q !== query)];
    let chosenName = 'Customer';

    for (const q of queriesToTry) {
      await customerSearchInput.fill('');
      await customerSearchInput.pressSequentially(q, { delay: 100 });
      await this.page.waitForTimeout(2000);

      const arrowCount = Math.max(1, index + 1);
      console.log(`   Navigating customer dropdown with ArrowDown x ${arrowCount} and Enter...`);
      for (let i = 0; i < arrowCount; i++) {
        await this.page.keyboard.press('ArrowDown');
        await this.page.waitForTimeout(250);
      }
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(2000);

      const isSelected = await this.page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('flt-semantics, p, span, div'));
        return all.some(e => (e.textContent || '').includes('View incomplete booking'));
      });

      if (isSelected) {
        console.log(`✅ Customer successfully selected at index ${index}!`);
        break;
      }
    }

    const modalTitle = this.page.locator('flt-semantics').filter({ hasText: /incomplete bookings for/i }).first();
    const hasIncomplete = await modalTitle.waitFor({ state: 'attached', timeout: 2500 }).then(() => true).catch(() => false);
    if (hasIncomplete) {
      console.log('⚠️ Incomplete Bookings modal displayed, clicking Continue...');
      const continueBtn = this.page.locator('flt-semantics[role="button"]').filter({ hasText: /^continue$/i }).first();
      const cBox = await continueBtn.boundingBox().catch(() => null);
      if (cBox) {
        await this.page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
      }
      await continueBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      await this.page.waitForTimeout(1200);
    }

    return chosenName;
  }

  async selectMultipleServices({ indices = [0, 1] } = {}) {
    console.log('4. Opening Service picker...');
    const serviceButton = this.page.locator('flt-semantics[role="button"]').filter({ hasText: /^\+?\s*Service$/i })
      .or(this.page.getByRole('button', { name: /^\+?\s*Service$/i }))
      .or(this.page.getByText('+ Service', { exact: true }))
      .or(this.page.getByText('Service', { exact: true }))
      .first();

    await serviceButton.waitFor({ state: 'attached', timeout: 10000 });
    const sBox = await serviceButton.boundingBox().catch(() => null);
    if (sBox) {
      await this.page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    } else {
      await serviceButton.click({ force: true, timeout: 3000 }).catch(() => {});
    }
    await this.page.waitForTimeout(1200);

    const serviceCheckboxes = this.page.locator('flt-semantics[role="checkbox"]');
    try {
      await serviceCheckboxes.first().waitFor({ state: 'attached', timeout: 5000 });
    } catch {
      console.log('⚠️ Service modal did not open on first click, retrying click...');
      if (sBox) {
        await this.page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
      } else {
        await serviceButton.click({ force: true, timeout: 3000 }).catch(() => {});
      }
      await serviceCheckboxes.first().waitFor({ state: 'attached', timeout: 10000 });
    }
    await this.page.waitForTimeout(1000);

    const total = await serviceCheckboxes.count();
    console.log(`📋 Available service checkboxes: ${total}`);

    for (const idx of indices) {
      if (idx < total) {
        await serviceCheckboxes.nth(idx).click({ force: true });
        console.log(`   ✅ Checked service #${idx + 1}`);
        await this.page.waitForTimeout(400);
      }
    }

    const applyButton = this.page.getByRole('button', { name: 'Apply', exact: true });
    await applyButton.click({ force: true });
    console.log('✅ Clicked Apply on services');
    await this.page.waitForTimeout(2000);
  }

  async assignDifferentStaffToRows() {
    console.log('Assigning staff to Row 1 ("audi by rohan")...');
    const dropdown1 = this.page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
      .or(this.page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
      .first();

    await dropdown1.waitFor({ state: 'attached', timeout: 10000 });
    const box1 = await dropdown1.boundingBox();
    if (box1) {
      await this.page.mouse.click(box1.x + box1.width / 2, box1.y + box1.height / 2);
    } else {
      await dropdown1.click({ force: true });
    }
    await this.page.waitForTimeout(1200);

    const audiOption = this.page.locator('flt-semantics').filter({ hasText: /^audi by rohan$/i })
      .or(this.page.getByText('audi by rohan', { exact: true }))
      .first();

    await audiOption.waitFor({ state: 'attached', timeout: 5000 });
    const audiBox = await audiOption.boundingBox();
    if (audiBox) {
      await this.page.mouse.click(audiBox.x + audiBox.width / 2, audiBox.y + audiBox.height / 2);
    } else {
      await audiOption.click({ force: true });
    }
    console.log('   ✅ Selected Row 1 staff: "audi by rohan"');
    await this.page.waitForTimeout(1200);

    console.log('   Assigning staff to Row 2 ("Dhruv Salat")...');
    const dropdown2 = this.page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
      .or(this.page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
      .first();

    await dropdown2.waitFor({ state: 'attached', timeout: 5000 });
    const box2 = await dropdown2.boundingBox();
    if (box2) {
      await this.page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
    } else {
      await dropdown2.click({ force: true });
    }
    await this.page.waitForTimeout(1200);

    const dhruvOption = this.page.locator('flt-semantics').filter({ hasText: /^Dhruv Salat$/i })
      .or(this.page.getByText('Dhruv Salat', { exact: true }))
      .first();

    await dhruvOption.waitFor({ state: 'attached', timeout: 5000 });
    const dhruvBox = await dhruvOption.boundingBox();
    if (dhruvBox) {
      await this.page.mouse.click(dhruvBox.x + dhruvBox.width / 2, dhruvBox.y + dhruvBox.height / 2);
    } else {
      await dhruvOption.click({ force: true });
    }
    console.log('   ✅ Selected Row 2 staff: "Dhruv Salat"');
    await this.page.waitForTimeout(1200);
  }
}
