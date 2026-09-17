import { test, expect } from '@playwright/test';

test.setTimeout(120000);

// ============================================================================
// 🔧 REUSABLE GENERIC WORKFLOW HELPERS
// ============================================================================

/**
 * Log into the salon management application.
 */
export async function login(page, {
  email = 'test_automation_owner@zylu.co',
  password = 'mt@0Ho6~vn4b'
} = {}) {
  console.log('1. Logging in...');
  await page.goto('https://devbiz.zylu.co/');
  await page.getByRole('textbox', { name: 'Email Address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.locator('//*[@id="loginForm"]/button').click();
  await page.waitForURL('**/#/home', { timeout: 30000 });
  console.log('✅ Logged in successfully');
}

/**
 * Open New Sale dialog and switch to the Booking tab.
 */
export async function openNewSaleBooking(page) {
  console.log('2. Opening New Sale & Booking tab...');
  await page.getByRole('button', { name: 'New Sale', exact: true }).click();
  await page.waitForTimeout(2000);

  await page.getByRole('tab', { name: 'Booking' }).click();
  await page.waitForTimeout(1500);
  console.log('✅ Switched to Booking tab');
}

/**
 * Generic Customer Selection:
 * Searches for a customer by query (letter, name, or phone) and selects by index or matching text.
 * Automatically handles the "Incomplete Bookings" popup if it appears.
 */
export async function selectCustomer(page, {
  query = 'r',
  index = 0,
  fallbackQueries = ['r', 's', 'm', 'a', 'e']
} = {}) {
  console.log(`3. Searching customer with query "${query}" (target index: ${index})...`);
  const customerSearchInput = page.getByRole('textbox', { name: 'Search Customer' });
  await customerSearchInput.click();

  const customerOptions = page.locator(
    'flt-semantics[role="option"], ' +
    'flt-semantics[role="listitem"], ' +
    'flt-semantics[role="button"]'
  ).filter({ hasText: /\+?\d{8,}/ });

  const queriesToTry = [query, ...fallbackQueries.filter(q => q !== query)];
  let found = false;

  for (const q of queriesToTry) {
    await customerSearchInput.fill('');
    await customerSearchInput.pressSequentially(q, { delay: 120 });

    try {
      await expect(customerOptions.first()).toBeVisible({ timeout: 5000 });
      const count = await customerOptions.count();
      console.log(`✅ Customer options visible after typing "${q}" (${count} found)`);
      found = true;
      break;
    } catch {
      console.log(`⚠️ No customer options for "${q}", trying next query...`);
    }
  }

  if (!found) {
    throw new Error(`No customer options found for any query in [${queriesToTry.join(', ')}]`);
  }

  const optionCount = await customerOptions.count();
  const targetIndex = Math.min(index, optionCount - 1);
  const targetOption = customerOptions.nth(targetIndex);
  const chosenCustomer = (await targetOption.textContent())?.trim() || '';

  console.log(`👤 Selected customer (index ${targetIndex} of ${optionCount}): "${chosenCustomer.replace(/\n/g, ' | ')}"`);
  await targetOption.click({ force: true });
  await page.waitForTimeout(1200);

  // Automatically handle Incomplete Bookings modal if present
  const modalTitle = page.locator('flt-semantics').filter({ hasText: /incomplete bookings for/i }).first();
  if (await modalTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('⚠️ Incomplete Bookings modal displayed, clicking Continue...');
    const continueBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^continue$/i }).first();
    await continueBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  return chosenCustomer;
}

/**
 * Generic Service Selection:
 * Supports searching specific services by keywords, selecting specific indices,
 * or selecting the top N available services.
 */
export async function selectServices(page, {
  services = [{ search: 'Hair' }, { search: 'Trim' }],
  indices = [1, 2],
  maxCount = 2
} = {}) {
  console.log('4. Opening Service picker...');
  const serviceButton = page.getByRole('button', { name: 'Service', exact: true });
  await serviceButton.scrollIntoViewIfNeeded().catch(() => {});
  await serviceButton.click({ force: true });

  const searchServicesInput = page.getByRole('textbox', { name: 'Search Services' })
    .or(page.locator('input[placeholder="Search Services"]'))
    .first();

  try {
    await searchServicesInput.waitFor({ state: 'attached', timeout: 5000 });
  } catch {
    console.log('⚠️ Service modal did not open on first click, retrying...');
    await serviceButton.click({ force: true });
    await searchServicesInput.waitFor({ state: 'attached', timeout: 10000 });
  }
  console.log('✅ Service picker opened');
  await page.waitForTimeout(1000);

  const serviceCheckboxes = page.locator('flt-semantics[role="checkbox"]');
  await serviceCheckboxes.first().waitFor({ state: 'attached', timeout: 10000 });

  const availableCount = await serviceCheckboxes.count();
  console.log(`📋 Available service checkboxes in modal: ${availableCount}`);

  let selectedCount = 0;

  // Mode A: Search-driven service selection
  if (Array.isArray(services) && services.length > 0) {
    for (const item of services) {
      if (selectedCount >= maxCount) break;
      const searchTerm = typeof item === 'string' ? item : item.search;
      console.log(`🔎 Searching for service matching "${searchTerm}"...`);

      try {
        await searchServicesInput.click({ force: true });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(200);
        await searchServicesInput.pressSequentially(searchTerm, { delay: 80 });
        await page.waitForTimeout(1200);

        const count = await serviceCheckboxes.count();
        if (count > 0) {
          const pickIndex = (typeof item === 'object' && item.index !== undefined) ? item.index : 0;
          const targetCheckbox = serviceCheckboxes.nth(Math.min(pickIndex, count - 1));
          const itemText = (await targetCheckbox.textContent().catch(() => ''))?.trim() || '';
          await targetCheckbox.click({ force: true });
          selectedCount++;
          console.log(`   ✅ Selected service for "${searchTerm}": "${itemText.replace(/\n/g, ' ')}"`);
        } else {
          console.log(`   ⚠️ No services found matching "${searchTerm}"`);
        }

        await searchServicesInput.click({ force: true });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(400);
      } catch (err) {
        console.log(`   ⚠️ Error during search for "${searchTerm}": ${err.message}`);
      }
    }
  }

  // Mode B: Index-based selection for remaining required services
  if (selectedCount < maxCount) {
    console.log(`ℹ️ Selecting remaining ${maxCount - selectedCount} services using distinct indices (${indices.join(', ')})...`);
    const total = await serviceCheckboxes.count();
    const candidateIndices = indices || [1, 2];
    for (const idx of candidateIndices) {
      if (selectedCount >= maxCount) break;
      if (idx < total) {
        await serviceCheckboxes.nth(idx).click({ force: true });
        selectedCount++;
        console.log(`   ✅ Selected distinct service at index #${idx}`);
        await page.waitForTimeout(300);
      }
    }
  }

  // Apply selected services
  const applyButton = page.getByRole('button', { name: 'Apply', exact: true });
  await applyButton.click({ force: true });
  console.log(`✅ Applied ${selectedCount} services`);
  await page.waitForTimeout(2000);
  return selectedCount;
}

/**
 * Click Quantity (+) for any specified service row.
 * Uses the "Qty" column header bounding box and row top alignment.
 */
export async function clickQuantityPlus(page, {
  rowIndex = 0,
  clickCount = 1,
  label = 'Quantity "+"'
} = {}) {
  for (let c = 0; c < clickCount; c++) {
    console.log(`5. Locating ${label} for service row #${rowIndex + 1} (click ${c + 1} of ${clickCount})...`);
    await page.waitForTimeout(1000);

    const buttonInfo = await page.evaluate(({ rowIndex }) => {
      // 1. Locate the "Qty" column header
      const allHeaders = Array.from(document.querySelectorAll('flt-semantics, div, span'))
        .filter(el => (el.textContent || '').trim() === 'Qty');

      let qtyHeaderRect = null;
      for (const h of allHeaders) {
        const r = h.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.top < 400) {
          qtyHeaderRect = { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          break;
        }
      }

      // 2. Locate Duration buttons to anchor each row vertically
      const durationNodes = Array.from(document.querySelectorAll('flt-semantics[role="button"]'))
        .filter(el => /\d+h|\d+m/i.test(el.textContent || ''))
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      let rowTop = null;
      let durationRect = null;
      if (durationNodes.length > rowIndex) {
        const r = durationNodes[rowIndex].getBoundingClientRect();
        rowTop = r.top;
        durationRect = { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      }

      // 3. Find small 24x24 buttons
      const smallButtons = Array.from(document.querySelectorAll('flt-semantics[role="button"]'))
        .map(el => {
          const rect = el.getBoundingClientRect();
          return {
            id: el.id,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            text: (el.textContent || '').trim()
          };
        })
        .filter(b => b.width >= 16 && b.width <= 32 && b.height >= 16 && b.height <= 32);

      let candidates = [];
      if (qtyHeaderRect) {
        candidates = smallButtons.filter(b =>
          b.left >= qtyHeaderRect.left - 20 &&
          b.right <= qtyHeaderRect.right + 25
        );
      } else if (durationRect) {
        candidates = smallButtons.filter(b =>
          b.left > durationRect.right + 40 &&
          b.left < durationRect.right + 160
        );
      }

      if (rowTop !== null) {
        const rowMatches = candidates.filter(b => Math.abs(b.top - rowTop) < 30);
        if (rowMatches.length > 0) candidates = rowMatches;
      }

      // Sort left to right: [-] on left, [+] on right
      candidates.sort((a, b) => a.left - b.left);

      if (candidates.length > 0) {
        const plus = candidates[candidates.length - 1];
        return {
          id: plus.id,
          left: plus.left,
          top: plus.top,
          width: plus.width,
          height: plus.height,
          centerX: plus.left + plus.width / 2,
          centerY: plus.top + plus.height / 2
        };
      }

      if (qtyHeaderRect && rowTop !== null) {
        return {
          id: null,
          centerX: qtyHeaderRect.right - 12,
          centerY: rowTop + 16
        };
      }

      return null;
    }, { rowIndex });

    console.log(`   Found ${label}:`, buttonInfo);

    if (buttonInfo && buttonInfo.id) {
      await page.locator(`#${buttonInfo.id}`).click({ force: true });
      console.log(`✅ Clicked ${label} (node #${buttonInfo.id})`);
    } else if (buttonInfo && buttonInfo.centerX) {
      console.log(`✅ Clicked ${label} via coordinates (${buttonInfo.centerX}, ${buttonInfo.centerY})`);
      await page.mouse.click(buttonInfo.centerX, buttonInfo.centerY);
    } else {
      console.log(`⚠️ Could not locate ${label} for row #${rowIndex + 1}`);
      return false;
    }

    await page.waitForTimeout(800);
  }

  return true;
}

/**
 * Assign staff to a service row, with optional "Copy Previous Staff" for subsequent services.
 */
export async function assignStaff(page, {
  serviceRowIndex = 0,
  copyToRemaining = true
} = {}) {
  console.log(`6. Assigning staff to service row #${serviceRowIndex + 1}...`);
  const selectStaffDropdown = page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
    .nth(serviceRowIndex);

  await selectStaffDropdown.waitFor({ state: 'attached', timeout: 10000 });
  await selectStaffDropdown.click({ force: true });
  await page.waitForTimeout(1000);

  const staffOptions = page.locator(
    'flt-semantics[role="option"]:visible, ' +
    'flt-semantics[role="listitem"]:visible'
  );

  let staffOption = null;
  if (await staffOptions.count() > 0) {
    staffOption = staffOptions.first();
  } else {
    const visibleButtons = page.locator('flt-semantics[role="button"]:visible');
    const buttonCount = await visibleButtons.count();
    for (let i = 0; i < buttonCount; i++) {
      const button = visibleButtons.nth(i);
      const text = ((await button.textContent().catch(() => '')) || '').trim();
      if (text && !/^select staff$/i.test(text) && !/^cancel$/i.test(text) && !/^close$/i.test(text)) {
        staffOption = button;
        break;
      }
    }
  }

  if (!staffOption) {
    throw new Error('Could not locate a staff option.');
  }

  const chosenStaffText = (await staffOption.textContent())?.trim() || '';
  await staffOption.click({ force: true });
  console.log(`✅ Assigned staff "${chosenStaffText}" to service row #${serviceRowIndex + 1}`);
  await page.waitForTimeout(1000);

  if (copyToRemaining) {
    console.log('   Using "Copy Previous Staff" for remaining services...');
    const copyPreviousStaff = page.locator('flt-semantics[role="button"]').filter({
      hasText: /^copy previous staff$/i
    }).first();

    if (await copyPreviousStaff.isVisible({ timeout: 3000 }).catch(() => false)) {
      await copyPreviousStaff.click({ force: true });
      console.log('✅ Copied staff to remaining services');
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Delete a service row by index.
 */
export async function deleteServiceRow(page, { rowIndex = 1 } = {}) {
  console.log(`7. Deleting service row #${rowIndex + 1}...`);
  const deleteBtnInfo = await page.evaluate(({ rowIndex }) => {
    const durationNodes = Array.from(document.querySelectorAll('flt-semantics[role="button"]'))
      .filter(el => /\d+h|\d+m/i.test(el.textContent || ''))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    if (durationNodes.length <= rowIndex) return null;
    const rowTop = durationNodes[rowIndex].getBoundingClientRect().top;

    const buttons = Array.from(document.querySelectorAll('flt-semantics[role="button"]'))
      .map(el => ({ id: el.id, rect: el.getBoundingClientRect() }))
      .filter(b => Math.abs(b.rect.top - rowTop) < 30 && b.rect.left > 850 && b.rect.width >= 20 && b.rect.height >= 20);

    return buttons.length > 0 ? buttons[0] : null;
  }, { rowIndex });

  if (deleteBtnInfo && deleteBtnInfo.id) {
    await page.locator(`#${deleteBtnInfo.id}`).click({ force: true });
    console.log(`✅ Clicked delete icon for service row #${rowIndex + 1}`);
    await page.waitForTimeout(1000);
    return true;
  } else {
    console.log(`⚠️ Could not locate delete icon for row #${rowIndex + 1} — skipping delete`);
    return false;
  }
}

/**
 * Navigate to the Checkout screen.
 */
export async function proceedToCheckout(page) {
  console.log('8. Proceeding to Checkout...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  const checkoutButton = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Checkout$/i })
    .or(page.getByRole('button', { name: 'Checkout', exact: true }))
    .or(page.getByText('Checkout', { exact: true }))
    .first();

  await checkoutButton.waitFor({ state: 'attached', timeout: 15000 });
  await checkoutButton.scrollIntoViewIfNeeded().catch(() => {});
  await checkoutButton.click({ force: true });
  console.log('✅ Clicked Checkout button');
  await page.waitForTimeout(2500);
}

/**
 * Read the customer's live cashback balance from the Checkout screen.
 */
export async function getCashbackBalance(page) {
  return await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    const cashbackEl = allElements.find(el => (el.textContent || '').trim() === 'Cashback');

    const balanceElements = allElements.filter(el => {
      const t = (el.textContent || '').trim();
      return /Balance\s*:\s*₹?([\d,.]+)/i.test(t);
    });

    let target = balanceElements[0];
    if (cashbackEl && balanceElements.length > 0) {
      const cTop = cashbackEl.getBoundingClientRect().top;
      const rowMatch = balanceElements.find(b => Math.abs(b.getBoundingClientRect().top - cTop) < 40);
      if (rowMatch) target = rowMatch;
    }

    if (target) {
      const m = target.textContent.match(/Balance\s*:\s*₹?([\d,.]+)/i);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        return isNaN(val) ? 0 : val;
      }
    }
    return 0;
  });
}

/**
 * Read total payment due from the Checkout screen.
 */
export async function getPaymentDue(page) {
  return await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    for (const el of allElements) {
      const t = (el.textContent || '').trim();
      const m = t.match(/Payment Due\s*₹?([\d,.]+)/i);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) return val;
      }
    }
    for (const el of allElements) {
      const t = (el.textContent || '').trim();
      const m = t.match(/TOTAL[:\s]*₹?([\d,.]+)/i);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) return val;
      }
    }
    return 0;
  });
}

/**
 * Set payment amount for a specific payment method row (Cashback, Card, Pay Later, etc.).
 */
export async function setPaymentAmount(page, method, amount) {
  console.log(`   Entering payment amount for "${method}": ₹${amount}`);

  const target = await page.evaluate(({ method }) => {
    const allElements = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    const labelEl = allElements.find(el => (el.textContent || '').trim() === method);
    if (!labelEl) return null;

    const lRect = labelEl.getBoundingClientRect();

    // 1. Look for mounted input on the same horizontal row
    const inputs = Array.from(document.querySelectorAll('input[data-semantics-role="text-field"], input[aria-label="Amount"], input[type="text"]'))
      .map(inp => {
        const r = inp.getBoundingClientRect();
        return {
          id: inp.id || inp.closest('flt-semantics')?.id,
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height
        };
      })
      .filter(inp =>
        Math.abs(inp.top - lRect.top) < 35 &&
        inp.left > lRect.left &&
        inp.left < lRect.left + 260
      )
      .sort((a, b) => a.left - b.left);

    if (inputs.length > 0) {
      return { id: inputs[0].id, centerX: inputs[0].left + inputs[0].width / 2, centerY: inputs[0].top + inputs[0].height / 2 };
    }

    // 2. Look for 90x30 semantics box
    const boxes = Array.from(document.querySelectorAll('flt-semantics'))
      .map(s => {
        const r = s.getBoundingClientRect();
        return {
          id: s.id,
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height
        };
      })
      .filter(s =>
        Math.abs(s.top - lRect.top) < 35 &&
        s.left > lRect.left &&
        s.left < lRect.left + 260 &&
        s.width >= 60 && s.width <= 140 &&
        s.height >= 20 && s.height <= 45
      )
      .sort((a, b) => a.left - b.left);

    if (boxes.length > 0) {
      return { id: boxes[0].id, centerX: boxes[0].left + boxes[0].width / 2, centerY: boxes[0].top + boxes[0].height / 2 };
    }

    // 3. Fallback coordinate
    return { id: null, centerX: lRect.right + 50, centerY: lRect.top + lRect.height / 2 };
  }, { method });

  if (!target) {
    throw new Error(`Could not locate payment row for "${method}"`);
  }

  if (target.id) {
    const loc = page.locator(`#${target.id}`);
    await loc.click({ force: true });
  } else {
    await page.mouse.click(target.centerX, target.centerY);
  }

  await page.waitForTimeout(400);

  // Type amount
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(String(amount), { delay: 50 });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  console.log(`   ✅ Successfully entered ₹${amount} for "${method}"`);
  return true;
}

/**
 * Perform conditional payment logic:
 * - If cashback balance > 0: pay half (capped at balance) with Cashback, remainder with Card.
 * - If cashback balance <= 0: pay full payment due with Pay Later.
 */
export async function processConditionalPayment(page) {
  console.log('9. Processing payment based on customer balance...');
  await page.waitForTimeout(2000);

  const paymentDue = await getPaymentDue(page);
  const cashbackBalance = await getCashbackBalance(page);

  console.log(`📊 Payment Due: ₹${paymentDue}`);
  console.log(`💰 Cashback Balance: ₹${cashbackBalance}`);

  if (cashbackBalance > 0) {
    console.log(`✅ Customer has cashback balance (₹${cashbackBalance}). Paying half with Cashback, remainder with Card...`);
    const halfDue = Math.round(paymentDue / 2);
    const cashbackPay = Math.min(halfDue, Math.floor(cashbackBalance));
    const cardPay = paymentDue - cashbackPay;

    console.log(`   • Cashback portion: ₹${cashbackPay}`);
    console.log(`   • Card portion: ₹${cardPay}`);

    await setPaymentAmount(page, 'Cashback', cashbackPay);
    await setPaymentAmount(page, 'Card', cardPay);
  } else {
    console.log(`ℹ️ Customer has no cashback balance (₹${cashbackBalance}). Paying full amount using Pay Later...`);
    await setPaymentAmount(page, 'Pay Later', paymentDue);
  }

  await page.waitForTimeout(1000);
}

/**
 * Detect and handle optional confirmation popups (Yes / OK / Proceed / Confirm).
 */
export async function handleOptionalPopups(page, maxPopups = 2) {
  for (let i = 1; i <= maxPopups; i++) {
    const popupButton = page.locator('flt-semantics[role="button"]')
      .filter({ hasText: /^(?:Yes|OK|Confirm|Proceed|Continue|Close|Got it)$/i })
      .first();

    const appeared = await popupButton.waitFor({ state: 'attached', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (appeared && await popupButton.isVisible().catch(() => false)) {
      const btnText = (await popupButton.textContent().catch(() => ''))?.trim();
      console.log(`✅ Found popup #${i} with button "${btnText || 'Yes/OK'}" — clicking it...`);
      await popupButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2000);
    } else {
      console.log(`ℹ️ No popup #${i} appeared — continuing`);
      break;
    }
  }
}

/**
 * Complete the sale, handle confirmation popups, and close the browser.
 */
export async function completeSaleAndClose(page, { maxPopups = 2, closeBrowser = true } = {}) {
  console.log('10. Completing sale...');
  const completeButton = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Complete$/i })
    .or(page.getByRole('button', { name: /^Complete$/i }))
    .or(page.getByText('Complete', { exact: true }))
    .first();

  await completeButton.waitFor({ state: 'attached', timeout: 15000 });
  await completeButton.click({ force: true });
  console.log('✅ Clicked "Complete"');

  console.log('11. Handling confirmation popups...');
  await handleOptionalPopups(page, maxPopups);

  await page.waitForTimeout(2500);

  if (closeBrowser) {
    console.log('12. Closing browser and context...');
    await page.close();
    await page.context().close();
    console.log('🎉 Workflow complete — browser closed successfully!');
  }
}

/**
 * End-to-end generic checkout orchestrator function.
 */
export async function runGenericCheckoutWorkflow(page, config = {}) {
  const {
    loginCredentials = {},
    customer = { query: 'r', index: 1 },
    services = [{ search: 'Hair' }, { search: 'Spa' }],
    quantityIncrements = [{ rowIndex: 0, clickCount: 1, label: 'First Service Quantity "+"' }],
    staffAssignment = { serviceRowIndex: 0, copyToRemaining: true },
    deleteRowIndex = 1,
    maxPopups = 2,
    closeBrowser = true
  } = config;

  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 Executing Generic Customer Checkout Workflow');
  console.log('════════════════════════════════════════════════════════════════');

  // 1. Login
  await login(page, loginCredentials);

  // 2. Open New Sale -> Booking Tab
  await openNewSaleBooking(page);

  // 3. Search and select customer
  const chosenCustomer = await selectCustomer(page, customer);

  // 4. Add services
  await selectServices(page, { services });

  // 5. Quantity increment (+)
  if (quantityIncrements && quantityIncrements.length > 0) {
    for (const qi of quantityIncrements) {
      await clickQuantityPlus(page, qi);
    }
  }

  // 6. Assign staff
  if (staffAssignment) {
    await assignStaff(page, staffAssignment);
  }

  // 7. Delete service row (optional)
  if (deleteRowIndex !== null && deleteRowIndex !== undefined) {
    await deleteServiceRow(page, { rowIndex: deleteRowIndex });
  }

  // 8. Checkout
  await proceedToCheckout(page);

  // 9. Conditional payment
  await processConditionalPayment(page);

  // 10, 11, 12. Complete sale, handle popups, close browser
  await completeSaleAndClose(page, { maxPopups, closeBrowser });

  return { chosenCustomer };
}

// ============================================================================
// 🧪 TEST SPEC
// ============================================================================

test('Generic Customer Checkout: Select Different Customer & Different Services', async ({ page }) => {

  // Configuration demonstrating GENERIC workflow with:
  // - A DIFFERENT customer (searched with query 'r', choosing index 1)
  // - DIFFERENT services (searched by keywords 'Hair' and 'Shave')
  const genericConfig = {
    customer: {
      query: 'r',   // Different query from previous 'a'
      index: 1      // 2nd option, different from previous 5th option
    },
    services: [
      { search: 'Hair' },
      { search: 'Shave' }
    ],
    quantityIncrements: [
      { rowIndex: 0, clickCount: 1, label: 'First Service Quantity "+"' }
    ],
    staffAssignment: {
      serviceRowIndex: 0,
      copyToRemaining: true
    },
    deleteRowIndex: 1, // Deletes the second service row
    maxPopups: 2,
    closeBrowser: true
  };

  await runGenericCheckoutWorkflow(page, genericConfig);
});
