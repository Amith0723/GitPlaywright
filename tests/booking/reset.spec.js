import { test, expect } from '@playwright/test';
import {
  login,
  openNewSaleBooking,
  selectCustomer,
  selectMultipleServices
} from '../../utils/helpers.js';

test.setTimeout(240000);

/**
 * Helper to change the booking date in the Booking tab.
 */
async function changeBookingDate(page) {
  console.log('📅 Changing Booking Date...');
  const dateBtn = page.getByRole('button', { name: /^\d{1,2}\/\d{1,2}\/\d{4}$/ })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^\d{1,2}\/\d{1,2}\/\d{4}$/ }))
    .first();

  await dateBtn.waitFor({ state: 'attached', timeout: 10000 });
  const dBox = await dateBtn.boundingBox().catch(() => null);
  if (dBox) {
    await page.mouse.click(dBox.x + dBox.width / 2, dBox.y + dBox.height / 2);
  } else {
    await dateBtn.click({ force: true });
  }
  await page.waitForTimeout(1500);

  // In calendar modal, pick a selectable day (e.g. day 16 or tomorrow)
  const today = new Date().getDate();
  const nextDay = today < 28 ? today + 1 : 1;

  const dayLocator = page.getByRole('button', { name: new RegExp(`^${nextDay},`) })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: new RegExp(`^${nextDay},`) }))
    .first();

  if (await dayLocator.isVisible({ timeout: 2500 }).catch(() => false)) {
    await dayLocator.click({ force: true });
    console.log(`   ✅ Selected Day ${nextDay} in calendar`);
  } else {
    // Fallback: click any available day cell in calendar
    const anyDay = page.locator('dialog button').filter({ hasText: /^\d{1,2},/ }).first();
    if (await anyDay.isVisible({ timeout: 2000 }).catch(() => false)) {
      await anyDay.click({ force: true });
    }
  }
  await page.waitForTimeout(800);

  // Click "OK" button in date picker
  const okBtn = page.getByRole('button', { name: 'OK', exact: true })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^OK$/i }))
    .last();

  await okBtn.waitFor({ state: 'attached', timeout: 5000 });
  const okBox = await okBtn.boundingBox().catch(() => null);
  if (okBox) {
    await page.mouse.click(okBox.x + okBox.width / 2, okBox.y + okBox.height / 2);
  } else {
    await okBtn.click({ force: true });
  }
  console.log('✅ Date picker confirmed with OK');
  await page.waitForTimeout(1500);
}

/**
 * Helper to change booking time in the Booking tab.
 */
async function changeBookingTime(page) {
  console.log('⏰ Changing Booking Time...');
  const timeBtn = page.getByRole('button', { name: /\d{1,2}:\d{2}\s*(?:AM|PM)/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /\d{1,2}:\d{2}\s*(?:AM|PM)/i }))
    .first();

  await timeBtn.waitFor({ state: 'attached', timeout: 10000 });
  const tBox = await timeBtn.boundingBox().catch(() => null);
  if (tBox) {
    await page.mouse.click(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  } else {
    await timeBtn.click({ force: true });
  }
  await page.waitForTimeout(1500);

  // In time picker dialog, toggle AM/PM or pick a different period
  const pmBtn = page.getByRole('radio', { name: 'PM' })
    .or(page.locator('flt-semantics[role="radio"]').filter({ hasText: /^PM$/i }))
    .or(page.getByText('PM', { exact: true }))
    .first();

  if (await pmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pmBtn.click({ force: true });
    console.log('   ✅ Toggled time period to PM');
    await page.waitForTimeout(500);
  }

  // Click "OK" button in time picker
  const okBtn = page.getByRole('button', { name: 'OK', exact: true })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^OK$/i }))
    .last();

  if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    const oBox = await okBtn.boundingBox().catch(() => null);
    if (oBox) {
      await page.mouse.click(oBox.x + oBox.width / 2, oBox.y + oBox.height / 2);
    } else {
      await okBtn.click({ force: true });
    }
    console.log('✅ Time picker confirmed with OK');
  }
  await page.waitForTimeout(1500);
}

/**
 * Helper to select a manager from the Manager dropdown.
 */
async function selectDifferentManager(page) {
  console.log('👔 Selecting Manager...');
  const managerDropdown = page.locator('flt-semantics[aria-label*="Select Manager"]')
    .or(page.locator('flt-semantics[role="group"]').filter({ hasText: /Select Manager/i }))
    .or(page.locator('flt-semantics').filter({ hasText: /^Select Manager$/i }))
    .or(page.getByText('Select Manager', { exact: true }))
    .first();

  await managerDropdown.waitFor({ state: 'attached', timeout: 10000 });
  const mBox = await managerDropdown.boundingBox().catch(() => null);
  if (mBox) {
    await page.mouse.click(mBox.x + mBox.width / 2, mBox.y + mBox.height / 2);
  } else {
    await managerDropdown.click({ force: true });
  }
  await page.waitForTimeout(1500);

  // Retrieve manager options
  const managerOptions = page.locator('flt-semantics[role="option"], flt-semantics[role="listitem"], flt-semantics[role="button"]')
    .filter({ hasNotText: /^(?:Reset|Cancel|Close|Select Manager|Booking|Walk-in|New|Sort|At Store|At Home)$/i });

  const count = await managerOptions.count();
  console.log(`📋 Found ${count} manager options`);

  if (count > 0) {
    // Pick the second option if available, otherwise first
    const target = count > 1 ? managerOptions.nth(1) : managerOptions.first();
    const managerName = (await target.textContent().catch(() => ''))?.trim() || 'Manager';
    await target.click({ force: true });
    console.log(`✅ Selected Manager: "${managerName}"`);
    await page.waitForTimeout(1500);
  } else {
    console.log('ℹ️ No extra manager options, continuing...');
  }
}

/**
 * Assign two distinct staff members (Row 1 and Row 2),
 * strictly EXCLUDING "Rohan" and "Dhruv".
 * Uses available staff members in the system (e.g. Artilla, DILIP, Dr Harror, Dummy employee).
 */
async function assignStaffExcludingRohanAndDhruv(page) {
  console.log('👥 Assigning staff (EXCLUDING Rohan & Dhruv)...');
  const candidateStaff = ['Artilla', 'DILIP', 'Dr Harror', 'Dummy employee', 'djdjf'];
  const assigned = [];

  for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
    console.log(`\n--- Assigning staff for Row #${rowIndex + 1} ---`);

    // 1. Open "Select Staff" dropdown for current row
    const dropdown = page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
      .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
      .first();

    await dropdown.waitFor({ state: 'attached', timeout: 10000 });
    const dropBox = await dropdown.boundingBox().catch(() => null);
    if (dropBox) {
      await page.mouse.click(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2);
    } else {
      await dropdown.click({ force: true });
    }
    await page.waitForTimeout(1500);

    // 2. Select a staff member that is NOT Rohan, NOT Dhruv, and NOT already assigned
    let selectedThisRow = false;

    // First try preferred named candidates
    for (const name of candidateStaff) {
      if (/rohan|dhruv/i.test(name) || assigned.includes(name)) continue;

      const opt = page.locator('flt-semantics').filter({ hasText: new RegExp(`^${name}$`, 'i') })
        .or(page.getByText(name, { exact: true }))
        .first();

      if (await opt.isVisible({ timeout: 1500 }).catch(() => false)) {
        const oBox = await opt.boundingBox().catch(() => null);
        if (oBox) {
          await page.mouse.click(oBox.x + oBox.width / 2, oBox.y + oBox.height / 2);
        } else {
          await opt.click({ force: true });
        }
        console.log(`   ✅ Selected non-Rohan/Dhruv staff: "${name}" for Row #${rowIndex + 1}`);
        assigned.push(name);
        selectedThisRow = true;
        break;
      }
    }

    // Fallback: find any visible option from dropdown that does NOT contain rohan or dhruv
    if (!selectedThisRow) {
      const allOptions = page.locator('flt-semantics[role="option"]:visible, flt-semantics[role="listitem"]:visible, flt-semantics[role="button"]:visible');
      const optCount = await allOptions.count();

      for (let i = 0; i < optCount; i++) {
        const item = allOptions.nth(i);
        const text = (await item.textContent().catch(() => ''))?.trim() || '';

        if (text && !/^(?:Select Staff|Cancel|Close|Apply|Reset|Booking|Walk-in|Sort|New|Review|Book Now|Checkout)$/i.test(text)) {
          if (!/rohan|dhruv/i.test(text) && !assigned.includes(text)) {
            await item.click({ force: true });
            console.log(`   ✅ Selected non-Rohan/Dhruv staff (fallback): "${text}" for Row #${rowIndex + 1}`);
            assigned.push(text);
            selectedThisRow = true;
            break;
          }
        }
      }
    }

    if (!selectedThisRow) {
      throw new Error(`Could not find any available non-Rohan/Dhruv staff for Row #${rowIndex + 1}`);
    }

    await page.waitForTimeout(1500);
  }

  console.log(`\n🎉 Assigned distinct staff: [${assigned.join(', ')}] (Neither is Rohan nor Dhruv)`);
  return assigned;
}

/**
 * Apply discounts:
 * - Gives different discounts to the service rows and/or booking.
 */
async function giveDiscounts(page) {
  console.log('🏷️ Applying Discounts...');

  // 1. Customize row-level discount in the services table
  const discDropdown = page.locator('flt-semantics[role="button"]').filter({ hasText: /^0(?:\.0)?%$/ }).first();
  if (await discDropdown.isVisible({ timeout: 2500 }).catch(() => false)) {
    console.log('   Clicking Row 1 discount dropdown ("0.0%")...');
    await discDropdown.click({ force: true });
    await page.waitForTimeout(1000);

    // Pick an available discount option (e.g. 10%, 15%, 20%)
    const discOption = page.locator('flt-semantics[role="option"], flt-semantics[role="listitem"], flt-semantics[role="button"]')
      .filter({ hasText: /^(?:5%|10%|12%|15%|20%|25%|\d{1,2}%)$/ })
      .first();

    if (await discOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      const optText = (await discOption.textContent().catch(() => ''))?.trim();
      await discOption.click({ force: true });
      console.log(`   ✅ Selected row discount: "${optText}" for Row #1`);
      await page.waitForTimeout(1000);
    } else {
      // If a text input popped up or dropdown didn't match, press Tab or Enter
      await page.keyboard.press('Escape');
    }
  }

  // 2. Scroll down to reveal Discount card and enter booking discount
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(1000);

  const discountInput = page.getByPlaceholder('Enter Discount')
    .or(page.locator('input[placeholder="Enter Discount"]'))
    .or(page.locator('input').filter({ hasText: /Enter Discount/i }))
    .first();

  const isVisible = await discountInput.isVisible({ timeout: 3000 }).catch(() => false);
  if (isVisible) {
    await discountInput.click({ force: true });
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('15', { delay: 60 });
    console.log('   ✅ Entered 15% discount in "Enter Discount" field');
    await page.waitForTimeout(1000);
  } else {
    const dPos = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      for (const inp of inputs) {
        const ph = inp.getAttribute('placeholder') || '';
        if (/discount/i.test(ph)) {
          const r = inp.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      }
      return null;
    });

    if (dPos) {
      await page.mouse.click(dPos.x, dPos.y);
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+A');
      await page.keyboard.type('15', { delay: 60 });
      console.log('   ✅ Entered 15% discount via coordinates');
      await page.waitForTimeout(1000);
    }
  }

  // Scroll back to top
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(1000);
}

// ============================================================================
// 🧪 TEST SPEC
// ============================================================================

test('Reset Booking: Customer, Date/Time, Manager, Non-Rohan/Dhruv Staff, Discount, and Reset', async ({ page }) => {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 Starting Reset Spec Test with Date, Time, Manager & Custom Staff');
  console.log('════════════════════════════════════════════════════════════════');

  // ---------------------------------------------------------------------------
  // STEP 1: Login
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 1: Login ---');
  await login(page);
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------------------
  // STEP 2: Open New Sale & switch to Booking tab
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 2: Open New Sale & Booking Tab ---');
  await openNewSaleBooking(page);
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------------------
  // STEP 3: Select Customer (Select a different customer, index 1)
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 3: Select Customer ---');
  const selectedCustomer = await selectCustomer(page, { query: 'r', index: 1 });
  console.log(`👤 Customer selected: "${selectedCustomer}"`);
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------------------------
  // STEP 4: Change Date and Timings
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 4: Change Date & Timings ---');
  await changeBookingDate(page);
  await changeBookingTime(page);

  // ---------------------------------------------------------------------------
  // STEP 5: Select Different Manager
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 5: Select Different Manager ---');
  await selectDifferentManager(page);

  // ---------------------------------------------------------------------------
  // STEP 6: Select Multiple Services
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 6: Select Multiple Services ---');
  await selectMultipleServices(page, { indices: [0, 1] });
  await page.waitForTimeout(2000);
  console.log('✅ Multiple services selected and applied');

  // ---------------------------------------------------------------------------
  // STEP 7: Assign Staff (Excluding Rohan & Dhruv)
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 7: Assign Staff (Excluding Rohan & Dhruv) ---');
  const assigned = await assignStaffExcludingRohanAndDhruv(page);
  console.log('Staff assignment complete:', assigned);
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------------------------
  // STEP 8: Give Discount
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 8: Give Discount ---');
  await giveDiscounts(page);

  // Take screenshot before Reset
  await page.screenshot({ path: 'scratch/before-reset.png', fullPage: true });
  console.log('📸 Screenshot saved: scratch/before-reset.png');

  // ---------------------------------------------------------------------------
  // STEP 9: Click Reset Button
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 9: Click Reset Button ---');
  const resetBtn = page.getByRole('button', { name: /^Reset$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Reset$/i }))
    .or(page.locator('flt-semantics').filter({ hasText: /^Reset$/i }))
    .or(page.getByText('Reset', { exact: true }))
    .first();

  await resetBtn.waitFor({ state: 'attached', timeout: 10000 });
  const rBox = await resetBtn.boundingBox().catch(() => null);
  console.log('Reset button bounding box:', rBox);

  if (rBox && rBox.width > 0) {
    console.log(`Clicking Reset button at (${Math.round(rBox.x + rBox.width / 2)}, ${Math.round(rBox.y + rBox.height / 2)})...`);
    await page.mouse.click(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
  } else {
    await resetBtn.click({ force: true });
  }
  console.log('✅ Clicked Reset button');
  await page.waitForTimeout(2000);

  // Handle confirmation modal if present ("Yes", "Confirm", "Reset", "OK")
  const confirmModalBtn = page.locator('flt-semantics[role="button"], button')
    .filter({ hasText: /^(?:Yes|Confirm|Reset|OK|Proceed)$/i })
    .last();

  if (await confirmModalBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    const btnText = (await confirmModalBtn.textContent().catch(() => ''))?.trim();
    console.log(`⚠️ Confirmation modal detected ("${btnText}") after clicking Reset — confirming...`);
    await confirmModalBtn.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Take screenshot after Reset
  await page.screenshot({ path: 'scratch/after-reset.png', fullPage: true });
  console.log('📸 Screenshot saved: scratch/after-reset.png');

  // ---------------------------------------------------------------------------
  // STEP 10: Verify Reset State
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 10: Verify Reset State ---');
  const remainingStaffDropdowns = page.locator('flt-semantics[role="group"][aria-label*="Staff"], flt-semantics[role="button"]:has-text("Select Staff")');
  const staffCount = await remainingStaffDropdowns.count();
  console.log(`Staff dropdown count after reset: ${staffCount}`);
  expect(staffCount).toBe(0);

  const searchCustomerInput = page.getByRole('textbox', { name: 'Search Customer' })
    .or(page.locator('input[placeholder*="Customer"], flt-semantics input').first());
  await expect(searchCustomerInput).toBeVisible({ timeout: 5000 });
  // ---------------------------------------------------------------------------
  // STEP 11: Close Browser
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 11: Close Browser ---');
  await page.close();
  await page.context().close();
  console.log('🔒 Browser and context closed successfully');

  console.log('════════════════════════════════════════════════════════════════');
  console.log('🎉 Reset Spec Test Completed Successfully & Verified');
  console.log('════════════════════════════════════════════════════════════════');
});
