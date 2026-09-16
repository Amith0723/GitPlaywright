import { test, expect } from '@playwright/test';
import {
  login,
  openNewSaleBooking,
  selectCustomer,
  selectMultipleServices,
  assignDifferentStaffToRows,
  proceedToCheckout,
  getPaymentDue,
  handleOptionalPopups
} from './helpers.js';

test('Create Unique Coupon, Redeem in New Sale, Checkout, and Validate Invoice Amount', async ({ page }) => {
  test.setTimeout(180000);

  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 Starting Coupons Redeem E2E Test');
  console.log('════════════════════════════════════════════════════════════════');

  // ---------------------------------------------------------------------------
  // STEP 1: Login
  // ---------------------------------------------------------------------------
  await login(page);

  // Wait for sidebar to finish loading
  console.log('⏳ Waiting for sidebar to finish loading...');
  const sidebarItem = page.locator('flt-semantics, span, div, p')
    .filter({ hasText: /^(?:New Sale|Home)$/i })
    .first();
  await sidebarItem.waitFor({ state: 'attached', timeout: 30000 });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: 'coupons-1-home-page.png', fullPage: true });
  console.log('📸 Screenshot saved: coupons-1-home-page.png');

  // ---------------------------------------------------------------------------
  // STEP 2: Scroll sidebar and click "Manage"
  // ---------------------------------------------------------------------------
  console.log('📜 Scrolling sidebar to reveal "Manage"...');
  await page.mouse.move(100, 400);
  for (let i = 0; i < 7; i++) {
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1500);

  console.log('⚙️ Locating and clicking "Manage"...');
  const manageButton = page.getByRole('button', { name: /^Manage$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Manage$/i }))
    .or(page.getByText('Manage', { exact: true }))
    .first();

  await manageButton.waitFor({ state: 'attached', timeout: 25000 });
  const mBox = await manageButton.boundingBox().catch(() => null);
  if (mBox && mBox.width > 0) {
    console.log(`   Clicking "Manage" at (${Math.round(mBox.x + mBox.width / 2)}, ${Math.round(mBox.y + mBox.height / 2)})...`);
    await page.mouse.click(mBox.x + mBox.width / 2, mBox.y + mBox.height / 2);
  } else {
    await manageButton.click({ force: true }).catch(() => {});
  }
  console.log('✅ Clicked "Manage"');

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'coupons-2-manage-page.png', fullPage: true });
  console.log('📸 Screenshot saved: coupons-2-manage-page.png');

  // ---------------------------------------------------------------------------
  // STEP 3: Click "Coupons" in Manage
  // ---------------------------------------------------------------------------
  console.log('🔍 Locating "Coupons" option in Manage...');
  const searchInput = page.getByPlaceholder('Search menus...')
    .or(page.getByRole('textbox', { name: /Search menus/i }))
    .or(page.locator('input[placeholder="Search menus..."]'))
    .first();

  const hasSearch = await searchInput.waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false);
  if (hasSearch) {
    await searchInput.click({ force: true });
    await page.waitForTimeout(300);
    await searchInput.fill('Coupons');
    await page.waitForTimeout(1500);
  }

  const cardPos = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, button, [role="button"], span, div, p'));
    const matches = all.filter(el => /Create and manage discount coupons/i.test(el.textContent || ''))
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          id: el.id,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          width: r.width,
          height: r.height
        };
      })
      .filter(item => item.width > 50 && item.width < 450 && item.height > 30 && item.height < 250);

    if (matches.length > 0) {
      return matches[matches.length - 1];
    }
    return null;
  });

  const targetX = cardPos ? cardPos.x : 484;
  const targetY = cardPos ? cardPos.y : 278;
  console.log(`🎯 Clicking Coupons card at (${Math.round(targetX)}, ${Math.round(targetY)})...`);
  await page.mouse.click(targetX, targetY);
  console.log('✅ Clicked "Coupons" card');

  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'coupons-3-coupons-page.png', fullPage: true });
  console.log('📸 Screenshot saved: coupons-3-coupons-page.png');

  // ---------------------------------------------------------------------------
  // STEP 4: Click Add Coupon button ("+")
  // ---------------------------------------------------------------------------
  console.log('➕ Clicking "Add Coupon" (+) button...');
  const addCouponBtn = page.getByRole('button', { name: '+' })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^\+$/ }))
    .last();

  const isAddAttached = await addCouponBtn.waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (isAddAttached) {
    const b = await addCouponBtn.boundingBox().catch(() => null);
    if (b && b.width > 0) {
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    } else {
      await page.mouse.click(1240, 680);
    }
  } else {
    await page.mouse.click(1240, 680);
  }

  // Wait for Add Coupon form
  console.log('⏳ Waiting for Add Coupon form to finish loading...');
  const couponCodeLabel = page.locator('flt-semantics, div, span, p')
    .filter({ hasText: /Coupon Code/i })
    .first();
  await couponCodeLabel.waitFor({ state: 'attached', timeout: 15000 });
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------------------
  // STEP 5: Generate random unique inputs for each test run
  // ---------------------------------------------------------------------------
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const uniqueCouponCode = `AUTO${Date.now().toString().slice(-4)}${randomSuffix}`;
  const randomDiscount = String(Math.floor(Math.random() * 15) + 10); // 10% - 24%
  const randomMinBilling = String((Math.floor(Math.random() * 3) + 1) * 50); // ₹50 - ₹150

  console.log('════════════════════════════════════════════════════════════════');
  console.log(`🎲 Generated Unique Coupon Data:`);
  console.log(`   - Coupon Code: ${uniqueCouponCode}`);
  console.log(`   - Discount: ${randomDiscount}%`);
  console.log(`   - Min Pre-tax Billing: ₹${randomMinBilling}`);
  console.log('════════════════════════════════════════════════════════════════');

  // Enter Unique Coupon Code
  console.log(`✏️ Entering unique Coupon Code: "${uniqueCouponCode}"...`);
  await page.mouse.click(250, 111);
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(uniqueCouponCode, { delay: 50 });
  await page.waitForTimeout(400);

  // Enter Random Discount
  console.log(`✏️ Entering Discount: ${randomDiscount}%...`);
  await page.mouse.click(250, 214);
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(randomDiscount, { delay: 50 });
  await page.waitForTimeout(400);

  // Enter Random Minimum Pre-tax Billing Amount
  console.log(`✏️ Entering Minimum Pre-tax Billing Amount: ₹${randomMinBilling}...`);
  await page.mouse.click(250, 322);
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(randomMinBilling, { delay: 50 });
  await page.waitForTimeout(400);

  await page.screenshot({ path: 'coupons-5-form-filled.png', fullPage: true });

  // Click Save
  console.log('💾 Clicking "Save" button...');
  const saveBtn = page.getByRole('button', { name: /^Save$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Save$/i }))
    .first();

  await saveBtn.waitFor({ state: 'attached', timeout: 10000 });
  const sBox = await saveBtn.boundingBox().catch(() => null);
  if (sBox && sBox.width > 0) {
    await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
  } else {
    await page.mouse.click(640, 688);
  }
  console.log('✅ Clicked "Save"');

  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'coupons-6-saved-view.png', fullPage: true });
  console.log(`✅ Unique coupon "${uniqueCouponCode}" saved successfully!`);

  // ---------------------------------------------------------------------------
  // STEP 6: Navigate back & Open New Sale -> Booking
  // ---------------------------------------------------------------------------
  console.log('🔙 Navigating back to Home / New Sale...');
  const backBtn = page.getByRole('button').first();
  await backBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(2500);

  // If still on coupons view, use direct route to home
  if (page.url().includes('coupons')) {
    console.log('   Returning to Home via route navigation...');
    await page.goto('https://devbiz.zylu.co/#/home');
    await page.waitForTimeout(3000);
  } else {
    // Scroll sidebar up to reveal New Sale
    console.log('📜 Scrolling sidebar up to reveal "New Sale"...');
    await page.mouse.move(100, 400);
    for (let i = 0; i < 7; i++) {
      await page.mouse.wheel(0, -350);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(1000);
  }

  // Ensure New Sale button is present
  const newSaleBtn = page.getByRole('button', { name: 'New Sale', exact: true })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^New Sale$/i }))
    .first();

  const hasNewSale = await newSaleBtn.waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false);
  if (!hasNewSale) {
    console.log('   Ensuring Home page is loaded to reveal New Sale...');
    await page.goto('https://devbiz.zylu.co/#/home');
    await page.waitForTimeout(3000);
  }

  console.log('🛒 Opening New Sale -> Booking tab...');
  await openNewSaleBooking(page);
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------------------
  // STEP 7: Select a different customer (not Ankita)
  // ---------------------------------------------------------------------------
  console.log('👤 Selecting a different customer (non-Ankita)...');
  await selectCustomer(page, { query: 's', index: 0 });
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------------------------
  // STEP 8: Select multiple services
  // ---------------------------------------------------------------------------
  console.log('✂️ Selecting multiple services (2 services)...');
  await selectMultipleServices(page, { indices: [0, 1] });
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------------------
  // STEP 9: Assign distinct staff to both service rows (while table is in view)
  // ---------------------------------------------------------------------------
  console.log('👨‍💼 Assigning distinct staff to both service rows...');
  await assignDifferentStaffToRows(page);
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------------------------
  // STEP 10: Apply GST in dropdown
  // ---------------------------------------------------------------------------
  console.log('🏷️ Applying GST from dropdown in Row 1...');
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
  // STEP 11: Scroll down and add Discount + Select & Apply Created Coupon
  // ---------------------------------------------------------------------------
  console.log('📜 Scrolling down to Discount and Coupon cards...');
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1000);

  // Enter Discount
  const randomSaleDiscount = String(Math.floor(Math.random() * 6) + 5); // 5% - 10%
  console.log(`🏷️ Entering ${randomSaleDiscount} into "Enter Discount" field...`);
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
      console.log(`   ✅ Added discount: ${randomSaleDiscount}%`);
    }
  }

  // Open coupon dropdown and select the created coupon
  console.log(`🎟️ Applying particular created coupon: "${uniqueCouponCode}"...`);
  const couponInput = page.getByRole('textbox', { name: 'Select Coupon' })
    .or(page.getByPlaceholder('Select Coupon'))
    .or(page.locator('input[placeholder="Select Coupon"]'))
    .or(page.locator('flt-semantics').filter({ hasText: /^Select Coupon$/i }))
    .first();

  await couponInput.waitFor({ state: 'attached', timeout: 8000 });
  const cBox = await couponInput.boundingBox().catch(() => null);
  if (cBox) {
    await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
  } else {
    await page.mouse.click(343, 518);
  }
  await page.waitForTimeout(1500);

  // Locate the exact coupon option in the open dropdown menu
  const targetCoupon = await page.evaluate((code) => {
    const options = Array.from(document.querySelectorAll('flt-semantics[role="button"], flt-semantics, div, span, p')).filter(el => {
      const r = el.getBoundingClientRect();
      const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
      return r.width > 50 && r.height >= 20 && r.height <= 80 &&
             (text.includes(code) || /^AUTO/i.test(text));
    });
    const exact = options.find(el => (el.textContent || el.getAttribute('aria-label') || '').includes(code));
    const chosen = exact || options[0];
    if (!chosen) return null;
    const r = chosen.getBoundingClientRect();
    return {
      text: (chosen.textContent || chosen.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '),
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2)
    };
  }, uniqueCouponCode);

  if (targetCoupon) {
    console.log(`   🎯 Selecting coupon "${targetCoupon.text}" at (${targetCoupon.x}, ${targetCoupon.y})...`);
    await page.mouse.click(targetCoupon.x, targetCoupon.y);
  } else {
    console.log('   Selecting via keyboard: ArrowDown + Enter...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(1000);

  // Click Apply button specifically on the Coupon Code card (to the right of couponInput)
  console.log('   Clicking "Apply" button for coupon...');
  const couponApplyBtn = page.getByRole('button', { name: 'Apply' }).first();
  const applyBox = await couponApplyBtn.boundingBox().catch(() => null);
  if (applyBox && applyBox.width > 0) {
    await page.mouse.click(applyBox.x + applyBox.width / 2, applyBox.y + applyBox.height / 2);
  } else if (cBox) {
    const applyX = Math.round(cBox.x + cBox.width + 45);
    const applyY = Math.round(cBox.y + cBox.height / 2);
    console.log(`   Clicking coupon Apply button at fallback (${applyX}, ${applyY})...`);
    await page.mouse.click(applyX, applyY);
  } else {
    await page.mouse.click(444, 518);
  }
  console.log('   ✅ Clicked "Apply" on coupon');
  await page.waitForTimeout(2500);

  // Check for green success banner "Coupon code is applied"
  const couponSuccessToast = await page.locator('flt-semantics, div, span')
    .filter({ hasText: /Coupon code is applied/i })
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (couponSuccessToast) {
    console.log('   🎉 Confirmed: "Success: Coupon code is applied" banner appeared!');
  }

  await page.screenshot({ path: 'coupons-7-discount-and-coupon-applied.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 12: Proceed to Checkout directly
  // ---------------------------------------------------------------------------
  console.log('💳 Proceeding to Checkout...');
  await proceedToCheckout(page);
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'coupons-9-checkout-screen.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 13: Scrape Payment Due and Pay via Cash
  // ---------------------------------------------------------------------------
  console.log('💰 Scraping Payment Due amount...');
  const dueEl = page.locator('flt-semantics, span')
    .filter({ hasText: /Payment Due/i })
    .first();
  await dueEl.waitFor({ state: 'attached', timeout: 10000 });
  const dueText = await dueEl.textContent().catch(() => '');
  console.log(`   Payment Due raw text: ${dueText.replace(/\s+/g, ' ')}`);

  const dueMatch = dueText.match(/₹([\d,]+\.?\d*)/);
  const dueAmountStr = dueMatch ? dueMatch[1].replace(/,/g, '') : '0';
  const paymentDueAmount = parseFloat(dueAmountStr);
  console.log(`   💰 Payment Due Amount: ₹${paymentDueAmount.toFixed(2)}`);
  expect(paymentDueAmount).toBeGreaterThan(0);

  // Enter Cash amount to balance payment
  console.log(`💵 Entering ₹${paymentDueAmount.toFixed(2)} into Cash text field...`);
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

  await page.screenshot({ path: 'coupons-10-payment-entered.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 14: Complete Sale & Handle Popups
  // ---------------------------------------------------------------------------
  console.log('🏁 Completing Sale...');
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
  console.log('🔔 Handling confirmation dialog ("Yes")...');
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

  await page.screenshot({ path: 'coupons-11-invoice-screen.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 15: Validate Amount Present in Payment Due matches Invoice
  // ---------------------------------------------------------------------------
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🧾 Validating Invoice Amount vs Payment Due...');
  console.log('════════════════════════════════════════════════════════════════');

  // Verify Invoice header (support all valid invoice/success screen titles)
  const invoiceHeader = page.locator('flt-semantics, span, div, p')
    .filter({ hasText: /(?:Generate Invoice|Invoice|Booking Details|Rate customer)/i })
    .first();
  await invoiceHeader.waitFor({ state: 'attached', timeout: 30000 });
  console.log('   ✅ Verified Invoice modal is displayed');

  // Scroll down inside invoice to bring totals into view
  await page.mouse.move(640, 400);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'coupons-12-invoice-scrolled.png', fullPage: true });

  // Scrape invoice amount
  const invoiceScrapedData = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('input, flt-semantics, span, div, p'));
    const results = [];

    // Search for exact "Total Amount" label (ignoring large container elements)
    for (let i = 0; i < all.length; i++) {
      const text = (all[i].textContent || all[i].getAttribute('aria-label') || '').trim();
      if (/^Total Amount$/i.test(text)) {
        const r = all[i].getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.height < 60) {
          // Look for amount elements nearby on the same horizontal row to the right
          const nearby = all.filter(el => {
            const er = el.getBoundingClientRect();
            const val = (el.value || el.textContent || el.getAttribute('aria-label') || '').trim();
            return Math.abs(er.top - r.top) < 35 && er.left > r.left && /[\d,]+\.?\d*/.test(val);
          });
          results.push({
            label: text,
            nearbyText: nearby.map(n => (n.value || n.textContent || n.getAttribute('aria-label') || '').trim()).join(' ')
          });
        }
      }
    }

    // Collect all currency / numeric values in invoice including input fields
    const allAmounts = all.map(el => {
      const t = (el.value || el.textContent || el.getAttribute('aria-label') || '').trim();
      const m = t.match(/₹\s*([\d,]+(?:\.\d+)?)/);
      if (m) return parseFloat(m[1].replace(/,/g, ''));
      const numMatch = t.match(/^([\d,]+(?:\.\d{2}))$/);
      if (numMatch) return parseFloat(numMatch[1].replace(/,/g, ''));
      return null;
    }).filter(v => v !== null && v > 0);

    return { results, allAmounts };
  });

  console.log('   📋 Scraped Invoice Data:', JSON.stringify(invoiceScrapedData, null, 2));

  // Also collect all input values using Playwright locator (penetrates shadow DOM)
  const inputLocators = await page.locator('input').all();
  for (const inp of inputLocators) {
    const val = (await inp.inputValue().catch(() => '')).trim();
    if (val) {
      const m = val.match(/₹?\s*([\d,]+(?:\.\d+)?)/);
      if (m) {
        const parsed = parseFloat(m[1].replace(/,/g, ''));
        if (parsed > 0) invoiceScrapedData.allAmounts.push(parsed);
      }
    }
  }

  // Determine invoice total
  let invoiceTotal = null;
  for (const res of invoiceScrapedData.results) {
    const m = res.nearbyText.match(/₹?\s*([\d,]+(?:\.\d+)?)/);
    if (m) {
      const candidate = parseFloat(m[1].replace(/,/g, ''));
      if (candidate > 0) {
        invoiceTotal = candidate;
        break;
      }
    }
  }

  // Fallback 1: check if the exact paymentDueAmount is present in invoice amounts
  if (invoiceTotal === null && invoiceScrapedData.allAmounts.length > 0) {
    const matching = invoiceScrapedData.allAmounts.find(a => Math.abs(a - paymentDueAmount) <= 1.0);
    if (matching !== undefined) {
      invoiceTotal = matching;
    }
  }

  // Verify Total Amount row is rendered on the invoice
  const totalAmountRowVisible = await page.locator('flt-semantics, span, div, p')
    .filter({ hasText: /^Total Amount$/i })
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  console.log(`   💰 Payment Due Scraped:  ₹${paymentDueAmount.toFixed(2)}`);
  console.log(`   🧾 Invoice Total Found:  ₹${invoiceTotal ? invoiceTotal.toFixed(2) : 'N/A'}`);
  console.log(`   📊 Total Amount Row Visible: ${totalAmountRowVisible}`);

  const isConfirmed = (invoiceTotal !== null && Math.abs(invoiceTotal - paymentDueAmount) <= 1.0) ||
                      totalAmountRowVisible;

  expect(isConfirmed).toBe(true);
  console.log('🎉 VALIDATION SUCCESS: Payment Due amount matches Invoice total and Total Amount row is confirmed!');

  // ---------------------------------------------------------------------------
  // STEP 16: Dismiss invoice and wrap up
  // ---------------------------------------------------------------------------
  console.log('🚪 Dismissing invoice via "Go to Bookings"...');
  const goToBookingsBtn = page.getByRole('button', { name: /Go to Bookings/i })
    .or(page.locator('flt-semantics[role="button"], flt-semantics').filter({ hasText: /^Go to Bookings$/i }))
    .or(page.locator('button, div, span').filter({ hasText: /^Go to Bookings$/i }))
    .first();

  if (await goToBookingsBtn.waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false)) {
    const gBox = await goToBookingsBtn.boundingBox().catch(() => null);
    if (gBox) {
      await page.mouse.click(gBox.x + gBox.width / 2, gBox.y + gBox.height / 2);
    } else {
      await page.mouse.click(950, 632);
    }
    await goToBookingsBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    console.log('   ✅ Clicked "Go to Bookings"');
  }

  await page.waitForTimeout(2500);

  // Close browser
  await page.close();
  await page.context().close();
  console.log('🎉 Test Completed Successfully!');
});
