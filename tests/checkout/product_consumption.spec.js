import { test, expect } from '@playwright/test';
import {
  login,
  openNewSaleBooking,
  selectCustomer,
  selectMultipleServices,
  assignDifferentStaffToRows,
  proceedToCheckout
} from '../../utils/helpers.js';

test('Package Consumption Flow: Login, Service, Add Tax, Discount, Checkout and Add Product Consumption in Invoice', async ({ page }) => {
  test.setTimeout(240000);
  console.log('🚀 Starting Test: Package / Product Consumption Flow');

  // ---------------------------------------------------------------------------
  // STEP 1: Login to Application
  // ---------------------------------------------------------------------------
  console.log('🔑 Step 1: Logging in...');
  await login(page);
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------------------
  // STEP 2: Open New Sale -> Booking Tab
  // ---------------------------------------------------------------------------
  console.log('🛒 Step 2: Opening New Sale -> Booking Tab...');
  await openNewSaleBooking(page);
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------------------
  // STEP 3: Select Customer
  // ---------------------------------------------------------------------------
  console.log('👤 Step 3: Selecting Customer...');
  await selectCustomer(page, { query: 's', index: 0 });
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------------------------
  // STEP 4: Select Services
  // ---------------------------------------------------------------------------
  console.log('✂️ Step 4: Selecting Services (2 services)...');
  await selectMultipleServices(page, { indices: [0, 1] });
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------------------
  // STEP 5: Assign Distinct Staff to Service Rows
  // ---------------------------------------------------------------------------
  console.log('👨‍💼 Step 5: Assigning Staff to Service Rows...');
  await assignDifferentStaffToRows(page);
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------------------------
  // STEP 6: Add Tax (GST)
  // ---------------------------------------------------------------------------
  console.log('🏷️ Step 6: Applying GST Tax...');
  await page.mouse.click(554, 348);
  await page.waitForTimeout(1200);

  const gstOption = page.locator('flt-semantics').filter({ hasText: /^GST (?:18%|5%|12%|28%)/i }).first();
  if (await gstOption.waitFor({ state: 'attached', timeout: 3000 }).then(() => true).catch(() => false)) {
    const gBox = await gstOption.boundingBox();
    if (gBox) {
      await page.mouse.click(gBox.x + gBox.width / 2, gBox.y + gBox.height / 2);
    } else {
      await gstOption.click({ force: true });
    }
    console.log('   ✅ Selected GST from dropdown');
  } else {
    console.log('   GST dropdown confirmed default selection');
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(1000);

  // ---------------------------------------------------------------------------
  // STEP 7: Add Discount
  // ---------------------------------------------------------------------------
  console.log('🏷️ Step 7: Adding Discount...');
  console.log('📜 Scrolling down to Discount card...');
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1000);

  const randomSaleDiscount = String(Math.floor(Math.random() * 6) + 5); // 5% - 10%
  console.log(`   Entering ${randomSaleDiscount}% into "Enter Discount" field...`);
  const discountInput = page.getByPlaceholder('Enter Discount')
    .or(page.locator('input[placeholder="Enter Discount"]'))
    .first();

  if (await discountInput.waitFor({ state: 'attached', timeout: 4000 }).then(() => true).catch(() => false)) {
    const dBox = await discountInput.boundingBox();
    if (dBox) {
      await page.mouse.click(dBox.x + dBox.width / 2, dBox.y + dBox.height / 2);
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+A');
      await page.keyboard.type(randomSaleDiscount);
      await page.waitForTimeout(300);
      await page.keyboard.press('Tab');
      console.log(`   ✅ Added discount: ${randomSaleDiscount}%`);
    }
  }
  await page.waitForTimeout(1000);

  // ---------------------------------------------------------------------------
  // STEP 8: Proceed to Checkout
  // ---------------------------------------------------------------------------
  console.log('💳 Step 8: Proceeding to Checkout...');
  await proceedToCheckout(page);
  await page.waitForTimeout(3000);

  // ---------------------------------------------------------------------------
  // STEP 9: Scrape Payment Due and Pay via Cash
  // ---------------------------------------------------------------------------
  console.log('💰 Step 9: Scraping Payment Due and entering Cash payment...');
  const dueEl = page.locator('flt-semantics, span')
    .filter({ hasText: /Payment Due/i })
    .first();
  await dueEl.waitFor({ state: 'attached', timeout: 15000 });
  const dueText = await dueEl.textContent().catch(() => '');
  console.log(`   Payment Due raw text: ${dueText.replace(/\s+/g, ' ')}`);

  const dueMatch = dueText.match(/₹([\d,]+\.?\d*)/);
  const dueAmountStr = dueMatch ? dueMatch[1].replace(/,/g, '') : '0';
  const paymentDueAmount = parseFloat(dueAmountStr);
  console.log(`   💰 Payment Due Amount: ₹${paymentDueAmount.toFixed(2)}`);
  expect(paymentDueAmount).toBeGreaterThan(0);

  // Enter Cash amount
  const cashLabel = page.locator('flt-semantics, span').filter({ hasText: /^Cash$/i }).first();
  const cashBox = await cashLabel.boundingBox();
  if (cashBox) {
    await page.mouse.click(cashBox.x + 150, cashBox.y + cashBox.height / 2);
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(dueAmountStr, { delay: 30 });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
  }
  await page.waitForTimeout(1000);

  // ---------------------------------------------------------------------------
  // STEP 10: Complete Sale & Confirmation Popup
  // ---------------------------------------------------------------------------
  console.log('🏁 Step 10: Completing Sale...');
  const completeButton = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Complete$/i })
    .or(page.getByRole('button', { name: /^Complete$/i }))
    .or(page.getByText('Complete', { exact: true }))
    .first();

  await completeButton.waitFor({ state: 'attached', timeout: 15000 });
  const compBox = await completeButton.boundingBox().catch(() => null);
  if (compBox) {
    await page.mouse.click(compBox.x + compBox.width / 2, compBox.y + compBox.height / 2);
  } else {
    await completeButton.click({ force: true }).catch(() => {});
  }
  console.log('   ✅ Clicked "Complete"');
  await page.waitForTimeout(2500);

  // Handle confirmation popup ("Yes")
  const yesBtn = page.getByRole('button', { name: /^Yes$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Yes$/i }))
    .or(page.locator('flt-semantics, button').filter({ hasText: /^Yes$/i }))
    .first();

  for (let attempt = 0; attempt < 3; attempt++) {
    const isYesVisible = await yesBtn.waitFor({ state: 'attached', timeout: 4000 }).then(() => true).catch(() => false);
    if (isYesVisible) {
      const yBox = await yesBtn.boundingBox().catch(() => null);
      if (yBox && yBox.width > 0) {
        await page.mouse.click(yBox.x + yBox.width / 2, yBox.y + yBox.height / 2);
      } else {
        await page.mouse.click(822, 431);
      }
      await yesBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      console.log(`   ✅ Clicked "Yes" on confirmation dialog (attempt ${attempt + 1})`);
      await page.waitForTimeout(2000);
    } else {
      break;
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 11: Verify Generate Invoice Screen & Scroll down to "Consume Products"
  // ---------------------------------------------------------------------------
  console.log('🧾 Step 11: Waiting for Generate Invoice Screen...');
  const invoiceHeader = page.locator('flt-semantics, span, div, p')
    .filter({ hasText: /(?:Generate Invoice|Invoice|Booking Details|Rate customer)/i })
    .first();
  await invoiceHeader.waitFor({ state: 'attached', timeout: 30000 });
  console.log('   ✅ Verified Invoice modal is displayed');

  // Scroll down inside invoice to bring "Consume Products" into view
  console.log('📜 Scrolling down to "Consume Products" section...');
  await page.mouse.move(640, 400);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'consumption-1-invoice-scrolled.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 12: Click "Select" under Consume Products
  // ---------------------------------------------------------------------------
  const selectBtn = page.getByRole('button', { name: 'Select', exact: true })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select$/i }))
    .first();

  await selectBtn.waitFor({ state: 'attached', timeout: 10000 });
  const selBox = await selectBtn.boundingBox();
  if (selBox && selBox.width > 0) {
    console.log(`   Clicking Select button at (${Math.round(selBox.x + selBox.width / 2)}, ${Math.round(selBox.y + selBox.height / 2)})`);
    await page.mouse.click(selBox.x + selBox.width / 2, selBox.y + selBox.height / 2);
  } else {
    await selectBtn.click({ force: true });
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'consumption-2-modal-opened.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 13: In Product Consumption modal, click "+ Add"
  // ---------------------------------------------------------------------------
  console.log('➕ Step 13: Clicking "+ Add" in Product Consumption modal...');
  const addBtn = page.getByRole('button', { name: 'Add', exact: true })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^\+?\s*Add$/i }))
    .first();

  await addBtn.waitFor({ state: 'attached', timeout: 10000 });
  const aBox = await addBtn.boundingBox().catch(() => null);
  if (aBox && aBox.width > 0) {
    await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
  } else {
    await page.mouse.click(320, 360);
  }
  console.log('   ✅ Clicked "+ Add"');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'consumption-3-add-clicked.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 14: Open "Select product" dropdown and choose product
  // ---------------------------------------------------------------------------
  console.log('📦 Step 14: Opening "Select product" dropdown at (412, 254)...');
  await page.mouse.click(412, 254);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'consumption-4-product-dropdown-opened.png', fullPage: true });

  // Click on product option from the open dropdown list ("ACAI OIL" at 320, 520)
  console.log('   Selecting "ACAI OIL" from dropdown at (320, 520)...');
  await page.mouse.click(320, 520);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'consumption-4-product-selected.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 15: Enter Quantity (1)
  // ---------------------------------------------------------------------------
  console.log('🔢 Step 15: Entering Quantity (1) at (495, 347)...');
  await page.mouse.click(495, 347);
  await page.waitForTimeout(400);

  // Clear and type '1'
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('1', { delay: 80 });
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(1000);
  console.log('   ✅ Handled Quantity entry: 1');
  await page.screenshot({ path: 'consumption-5-row-filled.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 16: Click Save button in Product Consumption
  // ---------------------------------------------------------------------------
  console.log('💾 Step 16: Saving Product Consumption at (742, 458)...');
  await page.mouse.click(742, 458);
  console.log('   ✅ Clicked "Save" on Product Consumption');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'consumption-6-saved.png', fullPage: true });

  // Close modal via button "Close" or 'X' icon or Escape
  console.log('   Closing Product Consumption modal...');
  const closeBtn = page.getByRole('button', { name: 'Close', exact: true })
    .or(page.locator('dialog button').first())
    .first();

  if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeBtn.click({ force: true });
    console.log('   ✅ Clicked "Close" button on modal');
  } else {
    // Click 'X' icon at top-right of modal
    await page.mouse.click(1020, 82);
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------------------
  // STEP 17: Dismiss invoice via "Go to Bookings"
  // ---------------------------------------------------------------------------
  console.log('🚪 Step 17: Dismissing invoice via "Go to Bookings"...');
  const goToBookingsBtn = page.getByRole('button', { name: /Go to Bookings/i })
    .or(page.locator('flt-semantics[role="button"], flt-semantics').filter({ hasText: /^Go to Bookings$/i }))
    .first();

  if (await goToBookingsBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    const gBox = await goToBookingsBtn.boundingBox().catch(() => null);
    if (gBox) {
      await page.mouse.click(gBox.x + gBox.width / 2, gBox.y + gBox.height / 2);
    } else {
      await goToBookingsBtn.click({ force: true });
    }
    console.log('   ✅ Clicked "Go to Bookings"');
  } else {
    console.log('   Fallback: clicking back button at (16, 36)...');
    await page.mouse.click(16, 36);
  }
  await page.waitForTimeout(3000);

  // ---------------------------------------------------------------------------
  // STEP 18: Navigate to Reports
  // ---------------------------------------------------------------------------
  console.log('📊 Step 18: Navigating to Reports...');
  await page.mouse.move(100, 400);
  for (let i = 0; i < 7; i++) {
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1500);

  const reportsButton = page.getByRole('button', { name: 'Reports', exact: true })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Reports$/i }))
    .or(page.getByText('Reports', { exact: true }))
    .first();
  await reportsButton.waitFor({ state: 'attached', timeout: 15000 });
  await reportsButton.click({ force: true });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  console.log('   ✅ Reached Reports page');

  // ---------------------------------------------------------------------------
  // STEP 19: Open Inventory -> Inventory Usage Report
  // ---------------------------------------------------------------------------
  console.log('📦 Step 19: Opening Inventory -> Inventory Usage Report...');
  const inventoryTab = page.getByRole('button', { name: /^Inventory$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Inventory$/i }))
    .or(page.getByText('Inventory', { exact: true }))
    .first();
  await inventoryTab.waitFor({ state: 'attached', timeout: 15000 });
  await inventoryTab.click({ force: true });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Click "Inventory Usage" card
  console.log('   Locating Inventory Usage card...');
  const usageCards = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics[role="button"], button, flt-semantics'));
    return all.filter(el => {
      const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
      return text.startsWith('Inventory Usage');
    }).map(el => {
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent || el.getAttribute('aria-label') || '').trim(),
        rect: { x: r.x, y: r.y, width: r.width, height: r.height }
      };
    });
  });
  const targetCard = usageCards.find(c => c.rect.width > 200 && c.rect.height > 40);
  if (targetCard) {
    console.log(`   Clicking Inventory Usage card at (${Math.round(targetCard.rect.x + targetCard.rect.width / 2)}, ${Math.round(targetCard.rect.y + targetCard.rect.height / 2)})...`);
    await page.mouse.click(targetCard.rect.x + targetCard.rect.width / 2, targetCard.rect.y + targetCard.rect.height / 2);
  } else {
    const usageBtn = page.getByRole('button', { name: /Inventory Usage/i }).first();
    await usageBtn.click({ force: true });
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);

  // ---------------------------------------------------------------------------
  // STEP 20: Validate Consumption in Inventory Usage Report
  // ---------------------------------------------------------------------------
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 Step 20: Validating Consumption in Inventory Usage Report...');
  console.log('════════════════════════════════════════════════════════════════');

  // 1. Verify Report Title
  const reportHeader = page.locator('flt-semantics, span, div, h1, h2')
    .filter({ hasText: /^Inventory Usage$/i })
    .first();
  await expect(reportHeader).toBeAttached({ timeout: 15000 });
  console.log('   ✅ Verified "Inventory Usage" report header is displayed');

  // 2. Wait for loading indicator to finish and table columns to appear
  console.log('   ⏳ Waiting for Inventory Usage table data to finish loading...');
  const txDateHeader = page.locator('flt-semantics, span, div')
    .filter({ hasText: /Transaction Date/i })
    .first();
  await txDateHeader.waitFor({ state: 'attached', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'consumption-7-inventory-usage-report.png', fullPage: true });

  // 3. Extract all report text elements
  const displayedElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, span, div, tr, td, th'));
    return all.map(el => (el.textContent || el.getAttribute('aria-label') || '').trim()).filter(Boolean);
  });

  console.log('   Sample displayed elements:', displayedElements.slice(0, 35));

  // 4. Verify Table Columns
  const hasTxDateCol = displayedElements.some(t => /Transaction Date/i.test(t));
  const hasProductCol = displayedElements.some(t => /Product Name/i.test(t));

  console.log(`   Table Column Headers: Transaction Date (${hasTxDateCol}), Product Name (${hasProductCol})`);
  expect(hasTxDateCol).toBe(true);
  expect(hasProductCol).toBe(true);

  // 5. Validate Consumption Entry matches displayed data
  const hasConsumptionType = displayedElements.some(t => /Consumption/i.test(t));
  const hasConsumedProduct = displayedElements.some(t => /ACAI OIL/i.test(t));

  console.log(`   Row Data Validation: Consumption Type (${hasConsumptionType}), Product ACAI OIL (${hasConsumedProduct})`);

  expect(hasConsumptionType).toBe(true);
  expect(hasConsumedProduct).toBe(true);

  console.log('🎉 VALIDATION SUCCESS: Product consumption successfully validated in Inventory Usage Report!');

  await page.waitForTimeout(2000);
  await page.close();
  await page.context().close();
  console.log('🎉 Test Completed Successfully!');
});
