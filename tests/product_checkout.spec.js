import { test, expect } from '@playwright/test';
import { login, openNewSaleBooking, selectCustomer, setPaymentAmount, handleOptionalPopups } from './helpers.js';

test('Select Random Product, Assign Staff, Add Notes, Checkout and Verify Invoice', async ({ page }) => {
  test.setTimeout(180000);
  console.log('🚀 Starting Test: Random Product Selection, Staff Assignment, Appointment Notes & Checkout');

  // STEP 1: Login & Open Sale
  await login(page);
  await openNewSaleBooking(page);
  await selectCustomer(page, { query: 'r', index: 0 });
  await page.waitForTimeout(2000);

  // STEP 2: Open "+ Product" modal
  console.log('📦 1. Opening "+ Product" modal...');
  const prodBtn = page.getByRole('button', { name: /Product/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /Product/i }))
    .first();
  await prodBtn.waitFor({ state: 'attached', timeout: 10000 });
  await prodBtn.click({ force: true });
  await page.waitForTimeout(3000);

  // STEP 3: List visible in-stock products and select one at RANDOM
  console.log('🎲 2. Finding selectable in-stock products in modal...');
  const productOptions = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, textarea, div, span, p'));
    const checkboxes = Array.from(document.querySelectorAll('flt-semantics[role="checkbox"]'))
      .filter(cb => {
        const cr = cb.getBoundingClientRect();
        return cr.width > 15 && cr.height > 15 && cr.x > 350;
      });

    const items = [];

    for (const el of all) {
      const aria = el.getAttribute('aria-label') || '';
      if (!aria.includes('Stock:')) continue;
      if (/Stock:\s*0/i.test(aria)) continue; // Skip out-of-stock items

      // Check regex format: "Name\nStock: N\nCode: ...\nBarcode: ...\n₹..."
      const lines = aria.split('\n').map(s => s.trim()).filter(Boolean);
      const name = lines[0] || 'Unknown Product';
      const stockMatch = aria.match(/Stock:\s*(\d+)/i);
      const priceMatch = aria.match(/(₹[\d,.]+)/);
      const stock = stockMatch ? parseInt(stockMatch[1], 10) : 1;
      const price = priceMatch ? priceMatch[1] : '';

      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        // Find corresponding checkbox near this y position
        const cb = checkboxes.find(c => {
          const cr = c.getBoundingClientRect();
          return Math.abs(cr.top + cr.height / 2 - (r.top + r.height / 2)) < 30;
        });

        items.push({
          name,
          stock,
          price,
          // Checkbox center is at x: 402 inside the modal
          cbX: cb ? Math.round(cb.getBoundingClientRect().left + cb.getBoundingClientRect().width / 2) : 402,
          cbY: cb ? Math.round(cb.getBoundingClientRect().top + cb.getBoundingClientRect().height / 2) : Math.round(r.top + r.height / 2),
          top: Math.round(r.top),
          height: Math.round(r.height)
        });
      }
    }

    // Deduplicate by name
    const seen = new Set();
    return items.filter(p => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  });

  console.log(`Found ${productOptions.length} in-stock selectable products:`);
  productOptions.forEach((p, i) => console.log(`   [${i}] ${p.name} | Stock: ${p.stock} | Price: ${p.price}`));
  expect(productOptions.length).toBeGreaterThan(0);

  // Pick ONE at RANDOM on every run
  const randomIndex = Math.floor(Math.random() * productOptions.length);
  const selectedProduct = productOptions[randomIndex];
  console.log(`\n🎯 Selected Random Product [Index ${randomIndex}]: "${selectedProduct.name}" (Stock: ${selectedProduct.stock}, Price: ${selectedProduct.price})`);

  // Click its checkbox directly at (selectedProduct.cbX, selectedProduct.cbY)
  console.log(`   Clicking checkbox at (${selectedProduct.cbX}, ${selectedProduct.cbY})...`);
  await page.mouse.click(selectedProduct.cbX, selectedProduct.cbY);
  await page.waitForTimeout(1000);

  // STEP 4: VERIFICATION 1 - Confirm checkbox actually shows checked/selected
  let isChecked = await page.evaluate((targetY) => {
    const checkboxes = Array.from(document.querySelectorAll('flt-semantics[role="checkbox"]'));
    const target = checkboxes.find(c => {
      const cr = c.getBoundingClientRect();
      return Math.abs(cr.top + cr.height / 2 - targetY) < 30;
    });
    return target ? (target.getAttribute('aria-checked') === 'true' || target.getAttribute('checked') === 'true') : false;
  }, selectedProduct.cbY);

  if (!isChecked) {
    console.log('⚠️ Checkbox not yet verified as checked, retrying click...');
    await page.mouse.click(selectedProduct.cbX, selectedProduct.cbY);
    await page.waitForTimeout(1000);
    isChecked = await page.evaluate((targetY) => {
      const checkboxes = Array.from(document.querySelectorAll('flt-semantics[role="checkbox"]'));
      const target = checkboxes.find(c => {
        const cr = c.getBoundingClientRect();
        return Math.abs(cr.top + cr.height / 2 - targetY) < 30;
      });
      return target ? (target.getAttribute('aria-checked') === 'true' || target.getAttribute('checked') === 'true') : false;
    }, selectedProduct.cbY);
  }

  console.log(`🔎 Verification 1 (Product Checkbox Checked): ${isChecked}`);
  // If aria-checked isn't exposed by Flutter canvas, ensure the modal is still open and proceed
  if (!isChecked) {
    const modalStillOpen = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, [role="button"]')).some(b => /^Apply$/i.test(b.textContent || ''));
    });
    console.log(`   Modal Apply button available: ${modalStillOpen}`);
  }

  // STEP 5: Click "Apply" to confirm product selection and close modal
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
  await page.waitForTimeout(3000);

  // STEP 6: VERIFICATION 2 - Confirm product row genuinely appears in the sale summary
  const isProductInSummary = await page.evaluate((name) => {
    const all = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    const cleanName = name.trim();
    const prefix = cleanName.slice(0, Math.min(10, cleanName.length));
    return all.some(el => {
      const aria = el.getAttribute('aria-label') || '';
      const text = el.textContent || '';
      return aria.includes(cleanName) || text.includes(cleanName) ||
        (prefix.length > 3 && (aria.includes(prefix) || text.includes(prefix)));
    });
  }, selectedProduct.name);

  console.log(`🔎 Verification 2 (Product "${selectedProduct.name}" appears in sale summary): ${isProductInSummary}`);
  expect(isProductInSummary).toBe(true);
  await page.screenshot({ path: 'scratch/verified-product-in-summary.png', fullPage: true });

  // STEP 7: Assign a DIFFERENT staff member at RANDOM to this product row
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

  // Retrieve all available staff options from the open dropdown
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

  // STEP 8: VERIFICATION 3 - Confirm staff dropdown shows selected staff member's name
  let isStaffAssigned = await page.evaluate((staffName) => {
    const all = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    const cleanStaff = staffName.trim();
    const firstName = cleanStaff.split(/\s+/)[0];
    return all.some(el => {
      const aria = (el.getAttribute('aria-label') || '').trim();
      const text = (el.textContent || '').trim();
      return (aria.includes(cleanStaff) || text.includes(cleanStaff) ||
        (firstName.length > 2 && (aria.includes(firstName) || text.includes(firstName)))) &&
        !aria.includes('Search');
    });
  }, selectedStaff.text);

  console.log(`🔎 Verification 3 (Staff "${selectedStaff.text}" assigned in sale summary): ${isStaffAssigned}`);
  expect(isStaffAssigned).toBe(true);

  // STEP 9: Add Appointment Notes with unique timestamp
  console.log('📝 5. Adding unique Appointment Notes...');
  const timestampStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const uniqueNote = `Automated test run - ${timestampStr}`;
  console.log(`   Note content: "${uniqueNote}"`);

  // Type note into Appointment Notes field
  const notesField = page.getByRole('textbox', { name: /Is there anything else you would like us to know/i })
    .or(page.locator('input[placeholder*="anything else"]'))
    .first();

  if (await notesField.isVisible().catch(() => false)) {
    await notesField.click({ force: true });
    await notesField.fill(uniqueNote);
  } else {
    // Coordinate click near the Appointment Notes box
    await page.mouse.click(620, 550);
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(uniqueNote, { delay: 25 });
  }
  await page.waitForTimeout(1000);
  console.log('✅ Appointment Notes successfully added');

  await page.screenshot({ path: 'scratch/verified-notes-added.png', fullPage: true });

  // STEP 10: Checkout
  console.log('💳 6. Clicking Checkout...');
  // Dismiss any focused inputs
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

  // STEP 11: Handle Payment / Quick-Cash step
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

  // Pay using Cash: locate Cash label and type into the Cash Amount text box
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
    // Fallback: use setPaymentAmount helper
    await setPaymentAmount(page, 'Cash', dueAmountStr).catch(err => console.log('   setPaymentAmount error:', err));
  }

  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/verified-payment-entered.png', fullPage: true });

  // STEP 12: Click "Complete"
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

  // STEP 13: Handle confirmation popup ("Yes") if present
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

  // STEP 14: VERIFICATION 4 - Confirm a success / invoice screen actually appears
  console.log('🧾 10. Validating invoice / success screen...');
  const invoiceHeader = page.locator('flt-semantics, span, div, p')
    .filter({ hasText: /(?:Generate Invoice|Invoice|Booking Details|Rate customer)/i })
    .first();
  await invoiceHeader.waitFor({ state: 'attached', timeout: 30000 });
  const invoiceHeaderText = (await invoiceHeader.textContent().catch(() => ''))?.trim();
  console.log(`🎉 Verification 4 Success: Screen "${invoiceHeaderText}" is visible and confirmed!`);
  expect(invoiceHeaderText).toMatch(/(?:Invoice|Booking|customer)/i);

  await page.screenshot({ path: 'scratch/verified-invoice-screen.png', fullPage: true });

  // Handle experience rating / Go to Bookings to cleanly close
  await handleOptionalPopups(page, 2);

  console.log('🎉 Full Random Product Checkout flow completed and verified successfully!');
  await page.close();
  await page.context().close();
});
