import { test, expect } from '@playwright/test';
import { login, openNewSaleBooking, setPaymentAmount, handleOptionalPopups } from './helpers.js';

test('Combined Incomplete Booking & Product Checkout Flow', async ({ page }) => {
  test.setTimeout(240000);
  console.log('🚀 Starting Combined Test: Incomplete Booking Check & Random Product Checkout Flow');

  // ===========================================================================
  // PART 1: LOGIN & CUSTOMER SELECTION
  // ===========================================================================
  console.log('\n--- PART 1: LOGIN & CUSTOMER SELECTION ---');
  await login(page);
  await page.waitForTimeout(2000);

  await openNewSaleBooking(page);
  await page.waitForTimeout(2000);

  console.log('🔍 Searching and selecting customer with query "r"...');
  const customerSearchInput = page.getByRole('textbox', { name: 'Search Customer' })
    .or(page.locator('input[placeholder="Search Customer"]'))
    .first();
  await customerSearchInput.waitFor({ state: 'attached', timeout: 10000 });
  await customerSearchInput.click();
  await customerSearchInput.fill('');
  await customerSearchInput.pressSequentially('r', { delay: 100 });
  await page.waitForTimeout(2000);

  // Keyboard navigation: press ArrowDown then Enter to select first customer
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);

  await page.screenshot({ path: 'scratch/after-customer-selected.png', fullPage: true });

  // ===========================================================================
  // PART 2: INCOMPLETE BOOKING DETECTION & HANDLING
  // ===========================================================================
  console.log('\n--- PART 2: INCOMPLETE BOOKING DETECTION & HANDLING ---');
  // Check if customer has incomplete booking
  // Possibility A: Automatic modal popup saying "incomplete bookings for ..."
  const modalTitle = page.locator('flt-semantics, div, span, p').filter({ hasText: /incomplete bookings? for/i }).first();
  const hasModal = await modalTitle.waitFor({ state: 'attached', timeout: 3000 }).then(() => true).catch(() => false);

  let hasIncompleteBookings = false;
  let incompleteCount = 0;

  if (hasModal) {
    hasIncompleteBookings = true;
    console.log('⚠️ Incomplete bookings modal appeared automatically!');
  } else {
    // Possibility B: Check right panel button "View incomplete bookings (N)"
    const incompleteBtnInfo = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('flt-semantics, button, [role="button"], span, div, p'));
      for (const el of all) {
        const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
        const match = text.match(/View incomplete bookings?\s*\((\d+)\)/i);
        if (match) {
          const count = parseInt(match[1], 10);
          const r = el.getBoundingClientRect();
          return { text, count, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), width: r.width, height: r.height };
        }
      }
      return null;
    });

    console.log('🔎 Incomplete booking button info:', incompleteBtnInfo);

    if (incompleteBtnInfo && incompleteBtnInfo.count > 0) {
      hasIncompleteBookings = true;
      incompleteCount = incompleteBtnInfo.count;
      console.log(`📋 Customer has ${incompleteCount} incomplete booking(s). Clicking "View incomplete booking"...`);

      const btn = page.getByRole('button', { name: /View incomplete bookings?\s*\(\d+\)/i })
        .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /View incomplete bookings?\s*\(\d+\)/i }))
        .first();

      await btn.waitFor({ state: 'attached', timeout: 5000 });
      const bBox = await btn.boundingBox().catch(() => null);
      if (bBox && bBox.width > 0) {
        await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
      } else {
        await btn.click({ force: true });
      }
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'scratch/incomplete-modal-opened.png', fullPage: true });
    } else {
      console.log('ℹ️ Customer has NO incomplete bookings (count is 0 or button not found).');
    }
  }

  // If customer has incomplete booking, click Continue button.
  // If not, close the browser
  if (hasIncompleteBookings) {
    console.log('👉 Incomplete booking detected. Locating and clicking "Continue" button...');
    const continueBtn = page.getByRole('button', { name: /Continue/i })
      .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^continue$/i }))
      .or(page.locator('flt-semantics').filter({ hasText: /^continue$/i }))
      .first();

    await continueBtn.waitFor({ state: 'attached', timeout: 10000 });
    const cBox = await continueBtn.boundingBox().catch(() => null);
    if (cBox && cBox.width > 0) {
      await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    } else {
      await continueBtn.click({ force: true });
    }
    console.log('✅ Clicked "Continue" button on incomplete booking!');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'scratch/after-continue-clicked.png', fullPage: true });
  } else {
    console.log('🛑 Customer does NOT have incomplete booking. Closing browser as requested...');
    await page.close();
    await page.context().close();
    console.log('✅ Browser closed successfully.');
    return;
  }

  // ===========================================================================
  // PART 3: PRODUCT SELECTION & CHECKOUT FLOW
  // ===========================================================================
  console.log('\n--- PART 3: PRODUCT SELECTION & CHECKOUT FLOW ---');

  // 1. Open "+ Product" modal
  console.log('📦 1. Opening "+ Product" modal...');
  const prodBtn = page.getByRole('button', { name: /Product/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /Product/i }))
    .first();
  await prodBtn.waitFor({ state: 'attached', timeout: 10000 });
  await prodBtn.click({ force: true });
  await page.waitForTimeout(3000);

  // 2. Find selectable in-stock products
  console.log('🎲 2. Finding selectable in-stock products in modal...');
  const productOptions = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, textarea, div, span, p'));
    const items = [];

    for (const el of all) {
      const aria = el.getAttribute('aria-label') || '';
      if (!aria.includes('Stock:')) continue;
      if (/Stock:\s*0/i.test(aria)) continue; // Skip out-of-stock items

      const lines = aria.split('\n').map(s => s.trim()).filter(Boolean);
      const name = lines[0] || 'Unknown Product';
      const stockMatch = aria.match(/Stock:\s*(\d+)/i);
      const priceMatch = aria.match(/(₹[\d,.]+)/);
      const stock = stockMatch ? parseInt(stockMatch[1], 10) : 1;
      const price = priceMatch ? priceMatch[1] : '';

      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        items.push({
          name,
          stock,
          price,
          cbX: 402,
          cbY: Math.round(r.top + r.height / 2),
          top: Math.round(r.top),
          height: Math.round(r.height)
        });
      }
    }
    return items;
  });

  console.log(`Found ${productOptions.length} in-stock selectable products:`);
  productOptions.forEach((p, i) => console.log(`   [${i}] ${p.name} | Stock: ${p.stock} | Price: ${p.price}`));
  expect(productOptions.length).toBeGreaterThan(0);

  // Pick ONE at RANDOM on every run
  const randomIndex = Math.floor(Math.random() * productOptions.length);
  const selectedProduct = productOptions[randomIndex];
  console.log(`\n🎯 Selected Random Product [Index ${randomIndex}]: "${selectedProduct.name}" (Stock: ${selectedProduct.stock}, Price: ${selectedProduct.price})`);

  // Click its checkbox by locating the exact group/checkbox for selectedProduct
  const cbCoords = await page.evaluate((prodName) => {
    const all = Array.from(document.querySelectorAll('flt-semantics[role="group"], flt-semantics'));
    const item = all.find(el => (el.getAttribute('aria-label') || '').includes(prodName));
    if (item) {
      const cb = item.querySelector('flt-semantics[role="checkbox"]');
      if (cb) {
        const cr = cb.getBoundingClientRect();
        return { x: Math.round(cr.left + cr.width / 2), y: Math.round(cr.top + cr.height / 2) };
      }
      const r = item.getBoundingClientRect();
      return { x: 402, y: Math.round(r.top + r.height / 2) };
    }
    return null;
  }, selectedProduct.name);

  const targetCb = page.locator('flt-semantics[role="group"]')
    .filter({ hasText: selectedProduct.name })
    .locator('flt-semantics[role="checkbox"]')
    .or(page.locator(`flt-semantics[aria-label*="${selectedProduct.name}"] flt-semantics[role="checkbox"]`))
    .first();

  if (await targetCb.isVisible({ timeout: 1500 }).catch(() => false)) {
    await targetCb.click({ force: true });
  } else if (cbCoords) {
    await page.mouse.click(cbCoords.x, cbCoords.y);
  } else {
    await page.mouse.click(selectedProduct.cbX, selectedProduct.cbY);
  }
  await page.waitForTimeout(1000);

  // VERIFICATION 1 - Confirm checkbox actually shows checked/selected
  let isChecked = await page.evaluate((prodName) => {
    const all = Array.from(document.querySelectorAll('flt-semantics[role="group"], flt-semantics'));
    const item = all.find(el => (el.getAttribute('aria-label') || '').includes(prodName));
    if (item) {
      const cb = item.querySelector('flt-semantics[role="checkbox"]');
      if (cb && (cb.getAttribute('aria-checked') === 'true' || cb.getAttribute('checked') !== null)) {
        return true;
      }
    }
    return false;
  }, selectedProduct.name);

  if (!isChecked) {
    console.log('⚠️ Checkbox not yet verified as checked, retrying click...');
    if (cbCoords) await page.mouse.click(cbCoords.x, cbCoords.y);
    await page.waitForTimeout(600);
    isChecked = await page.evaluate((prodName) => {
      const all = Array.from(document.querySelectorAll('flt-semantics[role="group"], flt-semantics'));
      const item = all.find(el => (el.getAttribute('aria-label') || '').includes(prodName));
      return item ? item.querySelector('flt-semantics[role="checkbox"]')?.getAttribute('aria-checked') === 'true' : false;
    }, selectedProduct.name);
  }

  console.log(`🔎 Verification 1 (Product Checkbox Checked): ${isChecked}`);
  expect(isChecked).toBe(true);

  // 3. Click "Apply" to confirm product selection and close modal
  console.log('✅ 3. Clicking "Apply" button...');
  const applyBtn = page.getByRole('button', { name: 'Apply', exact: true })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Apply$/i }))
    .first();
  await applyBtn.waitFor({ state: 'attached', timeout: 5000 });
  const aBox = await applyBtn.boundingBox().catch(() => null);
  if (aBox && aBox.width > 0) {
    await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
  } else {
    await applyBtn.click({ force: true });
  }

  // Wait for modal to close
  await page.locator('textbox[name="Search Products"]').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // VERIFICATION 2 - Confirm product row genuinely appears in the sale summary
  const isProductInSummary = await page.evaluate((name) => {
    const all = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    return all.some(el => {
      const aria = el.getAttribute('aria-label') || '';
      const text = el.textContent || '';
      return aria.includes(name) || text.includes(name);
    });
  }, selectedProduct.name);

  console.log(`🔎 Verification 2 (Product "${selectedProduct.name}" appears in sale summary): ${isProductInSummary}`);
  expect(isProductInSummary).toBe(true);
  await page.screenshot({ path: 'scratch/verified-product-in-summary.png', fullPage: true });

  // 4. Assign a DIFFERENT staff member at RANDOM to this product row
  console.log('👨‍💼 4. Assigning a staff member at RANDOM to product row...');
  const staffDropdown = page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
    .or(page.locator('flt-semantics').filter({ hasText: /^Select Staff$/i }))
    .first();

  await staffDropdown.waitFor({ state: 'attached', timeout: 8000 });
  const dropBox = await staffDropdown.boundingBox().catch(() => null);
  if (dropBox) {
    await page.mouse.click(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2);
  } else {
    await staffDropdown.click({ force: true });
  }
  await page.waitForTimeout(1500);

  // Retrieve available staff options from the open dropdown
  const staffList = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics[role="button"], flt-semantics[role="option"], flt-semantics'));
    const list = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      const t = (el.textContent || el.getAttribute('aria-label') || '').trim();
      if (r.width > 80 && r.height >= 25 && r.height <= 55 && t && !/^(?:Select Staff|Cancel|Close|Apply|Reset)$/i.test(t)) {
        list.push({ text: t, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
      }
    }
    const seen = new Set();
    return list.filter(item => {
      if (seen.has(item.text)) return false;
      seen.add(item.text);
      return true;
    });
  });

  const visibleStaffList = staffList.filter(s => !s.text.includes('@')).slice(0, 5);
  console.log(`Available visible staff members (${visibleStaffList.length}):`, visibleStaffList.map(s => s.text));
  expect(visibleStaffList.length).toBeGreaterThan(0);

  // Pick one staff member at RANDOM
  const randomStaffIndex = Math.floor(Math.random() * visibleStaffList.length);
  const selectedStaff = visibleStaffList[randomStaffIndex];
  console.log(`🎯 Selected Random Staff [Index ${randomStaffIndex}]: "${selectedStaff.text}"`);

  const staffOptionLocator = page.locator('flt-semantics[role="button"], flt-semantics')
    .filter({ hasText: new RegExp(`^${selectedStaff.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
    .or(page.getByText(selectedStaff.text, { exact: true }))
    .first();

  await staffOptionLocator.waitFor({ state: 'attached', timeout: 5000 });
  const sBox = await staffOptionLocator.boundingBox().catch(() => null);
  if (sBox && sBox.width > 0) {
    await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
  } else {
    await staffOptionLocator.click({ force: true });
  }
  await page.waitForTimeout(2000);

  // VERIFICATION 3 - Confirm staff dropdown shows selected staff member's name
  let isStaffAssigned = await page.evaluate((staffName) => {
    const all = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    return all.some(el => {
      const aria = (el.getAttribute('aria-label') || '').trim();
      const text = (el.textContent || '').trim();
      return (aria.includes(staffName) || text.includes(staffName)) && !aria.includes('Search');
    });
  }, selectedStaff.text);

  console.log(`🔎 Verification 3 (Staff "${selectedStaff.text}" assigned in sale summary): ${isStaffAssigned}`);
  expect(isStaffAssigned).toBe(true);

  // 5. Add Appointment Notes with unique timestamp
  console.log('📝 5. Adding unique Appointment Notes...');
  const timestampStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const uniqueNote = `Automated test run - ${timestampStr}`;
  console.log(`   Note content: "${uniqueNote}"`);

  const notesField = page.getByRole('textbox', { name: /Is there anything else you would like us to know/i })
    .or(page.locator('input[placeholder*="anything else"]'))
    .first();

  if (await notesField.isVisible().catch(() => false)) {
    await notesField.click({ force: true });
    await notesField.fill(uniqueNote);
  } else {
    await page.mouse.click(620, 550);
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(uniqueNote, { delay: 25 });
  }
  await page.waitForTimeout(1000);
  console.log('✅ Appointment Notes successfully added');

  await page.screenshot({ path: 'scratch/verified-notes-added.png', fullPage: true });

  // 6. Checkout
  console.log('💳 6. Clicking Checkout...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const checkoutBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Checkout$/i })
    .or(page.getByRole('button', { name: 'Checkout', exact: true }))
    .or(page.getByText('Checkout', { exact: true }))
    .first();

  await checkoutBtn.waitFor({ state: 'attached', timeout: 15000 });
  const cBox = await checkoutBtn.boundingBox().catch(() => null);
  if (cBox && cBox.width > 0) {
    await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
  } else {
    await checkoutBtn.click({ force: true });
  }
  await page.waitForTimeout(3000);

  // 7. Handle Payment via Cash
  console.log('💰 7. Checking Payment Due and paying via Cash...');
  const dueEl = page.locator('flt-semantics, span')
    .filter({ hasText: /Payment Due/i })
    .first();

  const isLanded = await dueEl.waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (!isLanded) {
    console.log('   Checkout not yet reached, retrying Checkout click...');
    if (cBox && cBox.width > 0) {
      await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    } else {
      await checkoutBtn.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(3000);
    await dueEl.waitFor({ state: 'attached', timeout: 15000 });
  }

  const dueText = await dueEl.textContent().catch(() => '');
  console.log(`   Payment Due raw text: ${dueText.replace(/\s+/g, ' ')}`);

  const dueMatch = dueText.match(/₹([\d,]+\.?\d*)/);
  const dueAmountStr = dueMatch ? dueMatch[1].replace(/,/g, '') : '0';
  const paymentDueAmount = parseFloat(dueAmountStr);
  console.log(`   💰 Payment Due Amount: ₹${paymentDueAmount.toFixed(2)}`);
  expect(paymentDueAmount).toBeGreaterThan(0);

  // Pay using Cash
  console.log(`💵 Entering ₹${dueAmountStr} into Cash field...`);
  const cashLabel = page.locator('flt-semantics, span').filter({ hasText: /^Cash$/i }).first();
  const cashBox = await cashLabel.boundingBox().catch(() => null);
  if (cashBox) {
    await page.mouse.click(cashBox.x + 100, cashBox.y + cashBox.height / 2);
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(dueAmountStr, { delay: 30 });
    await page.waitForTimeout(400);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
  } else {
    await setPaymentAmount(page, 'Cash', dueAmountStr).catch(err => console.log('   setPaymentAmount error:', err));
  }

  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/verified-payment-entered.png', fullPage: true });

  // 8. Click "Complete"
  console.log('🏁 8. Clicking "Complete" to finish checkout...');
  const completeBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Complete$/i })
    .or(page.getByRole('button', { name: /^Complete$/i }))
    .or(page.getByText('Complete', { exact: true }))
    .first();

  await completeBtn.waitFor({ state: 'attached', timeout: 15000 });
  const compBox = await completeBtn.boundingBox().catch(() => null);
  if (compBox) {
    await page.mouse.click(compBox.x + compBox.width / 2, compBox.y + compBox.height / 2);
  } else {
    await completeBtn.click({ force: true }).catch(() => {});
  }
  console.log('   ✅ Clicked "Complete"');
  await page.waitForTimeout(2500);

  // 9. Handle confirmation popup ("Yes") if present
  console.log('🔔 9. Handling confirmation popups...');
  const yesBtn = page.getByRole('button', { name: /^Yes$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Yes$/i }))
    .or(page.locator('flt-semantics, button').filter({ hasText: /^Yes$/i }))
    .first();

  if (await yesBtn.waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false)) {
    const yBox = await yesBtn.boundingBox().catch(() => null);
    if (yBox) {
      await page.mouse.click(yBox.x + yBox.width / 2, yBox.y + yBox.height / 2);
    } else {
      await page.mouse.click(822, 431);
    }
    await yesBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    console.log('   ✅ Clicked "Yes" on confirmation dialog');
    await page.waitForTimeout(2000);
  }

  // VERIFICATION 4 - Confirm a success / invoice screen actually appears
  console.log('🧾 10. Validating invoice / success screen...');
  const invoiceHeader = page.locator('flt-semantics, span, div, p')
    .filter({ hasText: /^(?:Generate Invoice|Invoice)$/i })
    .first();
  await invoiceHeader.waitFor({ state: 'attached', timeout: 30000 });
  const invoiceHeaderText = (await invoiceHeader.textContent().catch(() => ''))?.trim();
  console.log(`🎉 Verification 4 Success: Screen "${invoiceHeaderText}" is visible and confirmed!`);
  expect(invoiceHeaderText).toMatch(/Invoice/i);

  await page.screenshot({ path: 'scratch/verified-invoice-screen.png', fullPage: true });

  // Handle experience rating / Go to Bookings to cleanly close
  await handleOptionalPopups(page, 2);

  console.log('🎉 Combined Incomplete Booking & Product Checkout flow completed successfully!');
  await page.close();
  await page.context().close();
});
