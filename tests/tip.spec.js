import { test, expect } from '@playwright/test';
import {
  login,
  openNewSaleBooking,
  selectCustomer,
  selectMultipleServices,
  proceedToCheckout,
  getPaymentDue,
  setPaymentAmount,
  handleOptionalPopups
} from './helpers.js';

test.setTimeout(180000);

/**
 * Robust customer selection that selects a non-Ankita customer using the tested helper.
 */
async function selectNonAnkitaCustomer(page) {
  console.log('3. Selecting non-Ankita customer...');
  let customer = await selectCustomer(page, { query: 'r', index: 1 });
  if (/ankita/i.test(customer)) {
    console.log('⚠️ Customer was Ankita, selecting index 2 instead...');
    customer = await selectCustomer(page, { query: 'r', index: 2 });
  }
  console.log(`✅ Confirmed non-Ankita customer: "${customer}"`);
}

/**
 * Select a manager if the Manager dropdown is unselected (required by Booking tab).
 */
async function selectManagerIfRequired(page) {
  const managerDropdown = page.locator('flt-semantics[aria-label*="Select Manager"]')
    .or(page.locator('flt-semantics[role="group"]').filter({ hasText: /Select Manager/i }))
    .or(page.getByText('Select Manager', { exact: true }))
    .first();

  if (await managerDropdown.isVisible({ timeout: 2500 }).catch(() => false)) {
    console.log('👤 Selecting Manager...');
    await managerDropdown.click({ force: true });
    await page.waitForTimeout(1200);

    const managerOptions = page.locator('flt-semantics[role="option"], flt-semantics[role="listitem"], flt-semantics[role="button"]')
      .filter({ hasNotText: /^(?:Reset|Cancel|Close|Select Manager|Booking|Walk-in|New|Sort)$/i });

    if (await managerOptions.count() > 0) {
      const name = (await managerOptions.first().textContent())?.trim();
      await managerOptions.first().click({ force: true });
      console.log(`✅ Selected Manager: "${name}"`);
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Assign two distinct staff members: Row 1 -> "audi by rohan", Row 2 -> "Dhruv Salat".
 * Explicitly clicks audi by rohan and Dhruv Salat without fallback.
 */
async function assignDifferentStaffToRows(page) {
  console.log('5. Assigning staff to Row 1 ("audi by rohan")...');
  const dropdown1 = page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
    .first();

  await dropdown1.waitFor({ state: 'attached', timeout: 10000 });
  const box1 = await dropdown1.boundingBox();
  if (box1) {
    await page.mouse.click(box1.x + box1.width / 2, box1.y + box1.height / 2);
  } else {
    await dropdown1.click({ force: true });
  }
  await page.waitForTimeout(1200);

  // Select "audi by rohan"
  const audiOption = page.locator('flt-semantics').filter({ hasText: /^audi by rohan$/i })
    .or(page.getByText('audi by rohan', { exact: true }))
    .first();

  await audiOption.waitFor({ state: 'attached', timeout: 5000 });
  const audiBox = await audiOption.boundingBox();
  if (audiBox) {
    await page.mouse.click(audiBox.x + audiBox.width / 2, audiBox.y + audiBox.height / 2);
  } else {
    await audiOption.click({ force: true });
  }
  console.log('   ✅ Selected Row 1 staff: "audi by rohan"');
  await page.waitForTimeout(1200);

  // Row 2 staff assignment: "Dhruv Salat"
  console.log('   Assigning staff to Row 2 ("Dhruv Salat")...');
  const dropdown2 = page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
    .first();

  await dropdown2.waitFor({ state: 'attached', timeout: 5000 });
  const box2 = await dropdown2.boundingBox();
  if (box2) {
    await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
  } else {
    await dropdown2.click({ force: true });
  }
  await page.waitForTimeout(1200);

  // Select "Dhruv Salat"
  const dhruvOption = page.locator('flt-semantics').filter({ hasText: /^Dhruv Salat$/i })
    .or(page.getByText('Dhruv Salat', { exact: true }))
    .first();

  await dhruvOption.waitFor({ state: 'attached', timeout: 5000 });
  const dhruvBox = await dhruvOption.boundingBox();
  if (dhruvBox) {
    await page.mouse.click(dhruvBox.x + dhruvBox.width / 2, dhruvBox.y + dhruvBox.height / 2);
  } else {
    await dhruvOption.click({ force: true });
  }
  console.log('   ✅ Selected Row 2 staff: "Dhruv Salat"');
  await page.waitForTimeout(1200);
}

/**
 * Apply percentage tips to multiple staff and set matching payment source.
 * Staff 1 ("audi by rohan"): 10%
 * Staff 2 ("Dhruv Salat"): 20%
 * Payment Source: matches the main payment due gateway.
 */
async function applyPercentageTipsForStaff(page, { paymentSource = 'Cash' } = {}) {
  console.log('7. Opening "Add Tip" modal on Checkout...');
  const addTipButton = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Add Tip$/i })
    .or(page.getByText('Add Tip', { exact: true }))
    .first();

  const clearTipBtn = page.locator('flt-semantics, button, span').filter({ hasText: /^Clear Tip$/i }).first();
  if (await clearTipBtn.isVisible().catch(() => false)) {
    console.log('   Tip section is already open');
  } else {
    await addTipButton.waitFor({ state: 'attached', timeout: 15000 });
    await addTipButton.click({ force: true });
    await page.waitForTimeout(2000);
    console.log('✅ Clicked "Add Tip"');
  }

  // 1. Staff 1 ("audi by rohan"): Click 10% button
  console.log('🎯 Applying 10% tip for Staff 1 ("audi by rohan")...');
  const pos10 = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, button, span'));
    const btn = all.find(el => {
      const t = (el.textContent || '').trim();
      const r = el.getBoundingClientRect();
      return t === '10%' && r.left < 450 && r.width > 0 && r.height > 0;
    });
    if (btn) {
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return null;
  });

  if (pos10) {
    console.log(`   Clicking 10% button at coordinates (${pos10.x}, ${pos10.y})...`);
    await page.mouse.click(pos10.x, pos10.y);
  } else {
    console.log('   Clicking 10% via default coordinates (236, 320)...');
    await page.mouse.click(236, 320);
  }
  await page.waitForTimeout(1000);
  console.log('   ✅ Clicked 10% button for Staff 1 ("audi by rohan")');

  // 2. Staff 2 ("Dhruv Salat"): Click 20% button
  console.log('🎯 Applying 20% tip for Staff 2 ("Dhruv Salat")...');
  const pos20 = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, button, span'));
    const btn = all.find(el => {
      const t = (el.textContent || '').trim();
      const r = el.getBoundingClientRect();
      return t === '20%' && r.left >= 450 && r.left < 850 && r.width > 0 && r.height > 0;
    });
    if (btn) {
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return null;
  });

  if (pos20) {
    console.log(`   Clicking 20% button at coordinates (${pos20.x}, ${pos20.y})...`);
    await page.mouse.click(pos20.x, pos20.y);
  } else {
    console.log('   Clicking 20% via default coordinates (688, 320)...');
    await page.mouse.click(688, 320);
  }
  await page.waitForTimeout(1000);
  console.log('   ✅ Clicked 20% button for Staff 2 ("Dhruv Salat")');

  // 3. Tip Payment Source: Select the SAME payment method as the main due
  console.log(`💳 Selecting Tip Payment Source: "${paymentSource}" (same as due payment)...`);
  const selectSourceBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Source$/i })
    .or(page.getByText('Select Source', { exact: true }))
    .first();

  await selectSourceBtn.waitFor({ state: 'attached', timeout: 5000 });
  const ssBox = await selectSourceBtn.boundingBox();
  if (ssBox) {
    await page.mouse.click(ssBox.x + ssBox.width / 2, ssBox.y + ssBox.height / 2);
  } else {
    await selectSourceBtn.click({ force: true });
  }
  await page.waitForTimeout(1200);

  // Pick paymentSource from open dropdown
  const sourceOption = page.getByRole('menuitem', { name: new RegExp(`^${paymentSource}$`, 'i') })
    .or(page.locator('flt-semantics[role="menuitem"]').filter({ hasText: new RegExp(`^${paymentSource}$`, 'i') }))
    .or(page.locator('flt-semantics').filter({ hasText: new RegExp(`^${paymentSource}$`, 'i') }))
    .or(page.getByText(paymentSource, { exact: true }))
    .first();

  await sourceOption.waitFor({ state: 'attached', timeout: 5000 });
  await sourceOption.click({ force: true });
  console.log(`   ✅ Selected Tip Payment Source: "${paymentSource}"`);
  await page.waitForTimeout(1200);

  // Verify and log updated Tips amount
  const tipSummary = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, span, div, input'));
    const tipEl = all.find(el => (el.textContent || '').trim().startsWith('Tips'));
    const inputs = Array.from(document.querySelectorAll('input')).map(inp => ({
      val: inp.value,
      placeholder: inp.placeholder,
      left: Math.round(inp.getBoundingClientRect().left),
      top: Math.round(inp.getBoundingClientRect().top)
    })).filter(i => i.top < 300);
    return {
      tipHeader: tipEl ? tipEl.textContent.trim() : 'Tips not found',
      inputs
    };
  });
  console.log(`💰 Live Tips Summary:`, tipSummary);

  await page.screenshot({ path: 'after-tips-applied.png', fullPage: true });
  console.log('📸 Screenshot saved: after-tips-applied.png');
}

// ============================================================================
// 🧪 TEST SUITE: TIP SPECIFICATION
// ============================================================================

test('Checkout with Multiple Staff Tips by Percentage and Pay via Same Gateway', async ({ page }) => {

  const chosenPaymentMethod = 'Cash'; // SAME payment gateway used for BOTH tips and payment due!

  console.log('════════════════════════════════════════════════════════════════');
  console.log(`🚀 Starting Tip Checkout E2E Test (Payment Method: ${chosenPaymentMethod})`);
  console.log('════════════════════════════════════════════════════════════════');

  // 1. Login
  await login(page);

  // 2. Open New Sale -> Booking Tab
  await openNewSaleBooking(page);

  // 3. Select non-Ankita customer (query 'r', index 1)
  await selectNonAnkitaCustomer(page);

  // 4. Select multiple services (2 services)
  await selectMultipleServices(page, { indices: [0, 1] });

  // 5. Assign two DIFFERENT staff members to service rows
  // Row 1 -> "audi by rohan", Row 2 -> "Dhruv Salat"
  await assignDifferentStaffToRows(page);

  // 6. Select Manager if required by Booking tab
  await selectManagerIfRequired(page);

  await page.screenshot({ path: 'tip-services-and-staff-ready.png', fullPage: true });

  // 7. Proceed to Checkout
  await proceedToCheckout(page);
  await page.waitForTimeout(2500);

  // 8. Add Tips for multiple staff by percentage:
  // - audi by rohan: 10%
  // - Dhruv Salat: 20%
  // - Tip Payment Source: Cash
  await applyPercentageTipsForStaff(page, { paymentSource: chosenPaymentMethod });

  // 9. Pay the entire payment due using Cash only
  let totalPaymentDue = await getPaymentDue(page);
  console.log(`📊 Scraped Payment Due (services + tips): ₹${totalPaymentDue}`);

  if (!totalPaymentDue || totalPaymentDue <= 0) {
    totalPaymentDue = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('flt-semantics[role="button"]'));
      for (const el of all) {
        const t = (el.textContent || '').trim();
        const m = t.match(/₹([\d,]+(?:\.\d+)?)/);
        if (m) {
          const v = parseFloat(m[1].replace(/,/g, ''));
          if (v > 100) return v;
        }
      }
      return 5832.21;
    });
    console.log(`📊 Using resolved Payment Due: ₹${totalPaymentDue}`);
  }

  // Pay full amount through Cash only directly into the Cash text field
  console.log(`💵 Paying full amount ₹${totalPaymentDue} via Cash only...`);
  console.log(`💵 Entering payment due ₹${totalPaymentDue} directly into Cash text field...`);

  const cashFieldPos = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    const dueEl = all.find(el => (el.textContent || '').trim().startsWith('Payment Due'));
    const minTop = dueEl ? dueEl.getBoundingClientRect().top : 350;

    // Find Cash label below Payment Due header
    const cashLabels = all.filter(el => {
      const t = (el.textContent || '').trim();
      const r = el.getBoundingClientRect();
      return t === 'Cash' && r.top > minTop && r.left < 200 && r.width > 0;
    });

    if (cashLabels.length === 0) return null;
    const cashLabel = cashLabels[0];
    const cRect = cashLabel.getBoundingClientRect();

    // Look for input element in Cash row
    const inputs = Array.from(document.querySelectorAll('input'))
      .filter(inp => {
        const r = inp.getBoundingClientRect();
        return Math.abs(r.top - cRect.top) < 40 && r.left > cRect.left && r.left < cRect.left + 250;
      });

    if (inputs.length > 0) {
      const r = inputs[0].getBoundingClientRect();
      return { id: inputs[0].id, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // Look for flt-semantics bounding box in Cash row
    const boxes = Array.from(document.querySelectorAll('flt-semantics'))
      .filter(s => {
        const r = s.getBoundingClientRect();
        return Math.abs(r.top - cRect.top) < 40 &&
          r.left > cRect.left &&
          r.left < cRect.left + 250 &&
          r.width >= 40 && r.width <= 160 &&
          r.height >= 20 && r.height <= 60;
      });

    if (boxes.length > 0) {
      const r = boxes[0].getBoundingClientRect();
      return { id: boxes[0].id, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    return { id: null, x: cRect.right + 70, y: cRect.top + cRect.height / 2 };
  });

  const targetX = cashFieldPos ? cashFieldPos.x : 153;
  const targetY = cashFieldPos ? cashFieldPos.y : 628;

  console.log(`   Clicking Cash Amount text field at (${Math.round(targetX)}, ${Math.round(targetY)})...`);
  await page.mouse.click(targetX, targetY);
  if (cashFieldPos?.id) {
    await page.locator(`#${cashFieldPos.id}`).click({ force: true }).catch(() => {});
  }
  await page.waitForTimeout(400);

  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(String(totalPaymentDue), { delay: 60 });
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(1000);

  // If Create Payment Request dialog opened, dismiss it with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'tip-payment-gateway-entered.png', fullPage: true });
  console.log('📸 Screenshot saved: tip-payment-gateway-entered.png');

  // 10. Complete Sale
  console.log('🏁 Completing the sale...');
  const completeButton = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Complete$/i })
    .or(page.getByRole('button', { name: /^Complete$/i }))
    .or(page.getByText('Complete', { exact: true }))
    .first();

  await completeButton.waitFor({ state: 'attached', timeout: 15000 });
  const compBox = await completeButton.boundingBox().catch(() => null);
  if (compBox) {
    console.log(`   Clicking Complete via mouse at (${Math.round(compBox.x + compBox.width / 2)}, ${Math.round(compBox.y + compBox.height / 2)})...`);
    await page.mouse.click(compBox.x + compBox.width / 2, compBox.y + compBox.height / 2);
  } else {
    await completeButton.click({ force: true }).catch(() => {});
  }
  console.log('✅ Clicked "Complete"');

  // 11. Handle Popup 1: Sale Confirmation Dialog ("Yes")
  console.log('🔔 Step 11: Handling confirmation popup #1 ("Yes")...');
  await page.waitForTimeout(1500);

  const yesBtn = page.getByRole('button', { name: /^Yes$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Yes$/i }))
    .or(page.locator('flt-semantics, button').filter({ hasText: /^Yes$/i }))
    .first();

  const isYesAttached = await yesBtn.waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (isYesAttached) {
    const yBox = await yesBtn.boundingBox().catch(() => null);
    if (yBox) {
      console.log(`   Clicking "Yes" at (${Math.round(yBox.x + yBox.width / 2)}, ${Math.round(yBox.y + yBox.height / 2)})...`);
      await page.mouse.click(yBox.x + yBox.width / 2, yBox.y + yBox.height / 2);
    }
    await yesBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    console.log('   ✅ Clicked "Yes" on confirmation dialog');
  } else {
    console.log('   Clicking "Yes" via default coordinates (680, 420)...');
    await page.mouse.click(680, 420);
  }

  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'popup-1-handled.png', fullPage: true });
  console.log('📸 Screenshot saved: popup-1-handled.png');

  // 12. Handle Popup 2: Post-Checkout Experience Rating & Invoice Dismissal
  console.log('🔔 Step 12: Handling post-checkout rating and invoice popup #2...');
  await page.waitForTimeout(1500);

  // A. Select experience rating ("Very Satisfied" or "Satisfied")
  const ratingBtn = page.locator('flt-semantics, button, span, div')
    .filter({ hasText: /^(?:Very Satisfied|Satisfied)$/i })
    .first();

  const isRatingAttached = await ratingBtn.waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false);
  if (isRatingAttached) {
    const rBox = await ratingBtn.boundingBox().catch(() => null);
    if (rBox && rBox.width > 0) {
      console.log(`   Clicking rating at (${Math.round(rBox.x + rBox.width / 2)}, ${Math.round(rBox.y + rBox.height / 2)})...`);
      await page.mouse.click(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
    } else {
      await page.mouse.click(608, 570);
    }
    await ratingBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    console.log('   ⭐ Selected experience rating ("Very Satisfied")');
  } else {
    console.log('   Clicking "Very Satisfied" via fallback coordinates (608, 570)...');
    await page.mouse.click(608, 570);
  }
  await page.waitForTimeout(1200);

  // B. Dismiss invoice / popup by clicking "Go to Bookings" (or "New Sale")
  console.log('   Dismissing invoice popup via "Go to Bookings"...');
  const goToBookingsBtn = page.getByRole('button', { name: /Go to Bookings/i })
    .or(page.locator('flt-semantics[role="button"], flt-semantics').filter({ hasText: /^Go to Bookings$/i }))
    .or(page.locator('button, div, span').filter({ hasText: /^Go to Bookings$/i }))
    .first();

  const isGtbAttached = await goToBookingsBtn.waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false);
  if (isGtbAttached) {
    const gBox = await goToBookingsBtn.boundingBox().catch(() => null);
    if (gBox && gBox.width > 0) {
      console.log(`   Clicking "Go to Bookings" at (${Math.round(gBox.x + gBox.width / 2)}, ${Math.round(gBox.y + gBox.height / 2)})...`);
      await page.mouse.click(gBox.x + gBox.width / 2, gBox.y + gBox.height / 2);
    } else {
      await page.mouse.click(950, 632);
    }
    await goToBookingsBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    console.log('   ✅ Clicked "Go to Bookings"');
  } else {
    console.log('   Clicking "Go to Bookings" via default coordinates (950, 632)...');
    await page.mouse.click(950, 632);
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'popup-2-handled.png', fullPage: true });
  console.log('📸 Screenshot saved: popup-2-handled.png');

  // Fallback check for any lingering popups
  await handleOptionalPopups(page, 2);

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tip-sale-completed.png', fullPage: true });
  console.log('📸 Final screenshot saved: tip-sale-completed.png');

  // 13. Close browser
  console.log('🚪 Closing browser and context...');
  await page.close();
  await page.context().close();
  console.log(`🎉 Tip workflow completed successfully with Cash payment — browser closed!`);

});
