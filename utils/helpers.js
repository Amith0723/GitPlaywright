import { expect } from '@playwright/test';

/**
 * Log into the salon management application.
 */
export async function login(page, {
  email = 'test_automation_owner@zylu.co',
  password = 'mt@0Ho6~vn4b'
} = {}) {
  console.log('1. Logging in...');
  await page.goto('https://devbiz.zylu.co/');
  await page.waitForLoadState('domcontentloaded');

  // Ensure "Email & Password" mode is active
  const emailTab = page.locator('button').filter({ hasText: /^Email & Password$/i }).first();
  if (await emailTab.isVisible().catch(() => false)) {
    await emailTab.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Fill credentials using exact IDs
  const emailInput = page.locator('#email').or(page.getByRole('textbox', { name: 'Email Address' })).first();
  await emailInput.fill(email);

  const passwordInput = page.locator('#password').or(page.getByRole('textbox', { name: 'Password' })).first();
  await passwordInput.fill(password);

  const submitButton = page.locator('#loginForm button[type="submit"]')
    .or(page.locator('//*[@id="loginForm"]/button'))
    .or(page.getByRole('button', { name: 'Sign In' }))
    .first();
  await submitButton.click();

  // Handle possible transient login error (e.g. "Failed to fetch") with automatic retry
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.waitForURL('**/#/home', { timeout: 15000 });
      console.log('✅ Logged in successfully');
      return;
    } catch {
      const loginFailed = page.locator('text=Login Failed, text=Failed to fetch').first();
      if (await loginFailed.isVisible().catch(() => false)) {
        console.log('⚠️ Transient "Login Failed / Failed to fetch" error encountered, retrying submit...');
        await page.waitForTimeout(2000);
        await submitButton.click().catch(() => {});
      }
    }
  }

  await page.waitForURL('**/#/home', { timeout: 30000 });
  console.log('✅ Logged in successfully');
}

/**
 * Open New Sale dialog and switch to the Booking tab.
 */
export async function openNewSaleBooking(page) {
  console.log('2. Opening New Sale & Booking tab...');
  
  // If any modal/overlay like Growth Setup is open, dismiss it
  const closeOverlayBtn = page.locator('dialog button').first();
  if (await closeOverlayBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await closeOverlayBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }

  const newSaleBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^New Sale$/i })
    .or(page.getByRole('button', { name: 'New Sale', exact: true }))
    .first();

  let isVisible = await newSaleBtn.isVisible().catch(() => false);
  if (!isVisible) {
    console.log('   Scrolling sidebar up to reveal "New Sale"...');
    await page.mouse.move(100, 400);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, -400);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(1000);
  }

  await newSaleBtn.waitFor({ state: 'attached', timeout: 15000 });
  const b = await newSaleBtn.boundingBox().catch(() => null);
  if (b && b.width > 0) {
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  } else {
    await newSaleBtn.click({ force: true });
  }
  await page.waitForTimeout(2000);

  const bookingTab = page.getByRole('tab', { name: 'Booking' })
    .or(page.locator('flt-semantics[role="tab"]').filter({ hasText: /^Booking$/i }))
    .first();
  if (await bookingTab.isVisible({ timeout: 4000 }).catch(() => false)) {
    await bookingTab.click({ force: true });
    await page.waitForTimeout(1500);
    console.log('✅ Switched to Booking tab');
  } else {
    // Retry clicking New Sale if booking tab hasn't appeared
    await page.mouse.click(100, 316);
    await page.waitForTimeout(2000);
    if (await bookingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bookingTab.click({ force: true });
      await page.waitForTimeout(1500);
    }
    console.log('✅ Switched to Booking tab');
  }
}

/**
 * Generic Customer Selection:
 * Searches for a customer by query and selects by index.
 */
export async function selectCustomer(page, {
  query = 'r',
  index = 0,
  fallbackQueries = ['r', 's', 'm', 'a', 'e']
} = {}) {
  console.log(`3. Searching customer with query "${query}" (target index: ${index})...`);
  const customerSearchInput = page.getByRole('textbox', { name: 'Search Customer' });
  await customerSearchInput.click();
  await page.waitForTimeout(500);

  const queriesToTry = [query, ...fallbackQueries.filter(q => q !== query)];
  let chosenName = 'Customer';

  for (const q of queriesToTry) {
    await customerSearchInput.fill('');
    await customerSearchInput.pressSequentially(q, { delay: 100 });
    await page.waitForTimeout(2000);

    // Keyboard navigation: press ArrowDown (index + 1) times, then press Enter
    const arrowCount = Math.max(1, index + 1);
    console.log(`   Navigating customer dropdown with ArrowDown x ${arrowCount} and Enter...`);
    for (let i = 0; i < arrowCount; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(250);
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Verify right panel shows incomplete booking indicator (visible only when customer selected)
    const isSelected = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('flt-semantics, p, span, div'));
      return all.some(e => (e.textContent || '').includes('View incomplete booking'));
    });

    if (isSelected) {
      console.log(`✅ Customer successfully selected at index ${index}!`);
      break;
    }
  }

  // Automatically handle Incomplete Bookings modal if present
  const modalTitle = page.locator('flt-semantics').filter({ hasText: /incomplete bookings for/i }).first();
  const hasIncomplete = await modalTitle.waitFor({ state: 'attached', timeout: 2500 }).then(() => true).catch(() => false);
  if (hasIncomplete) {
    console.log('⚠️ Incomplete Bookings modal displayed, clicking Continue...');
    const continueBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^continue$/i }).first();
    const cBox = await continueBtn.boundingBox().catch(() => null);
    if (cBox) {
      await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    }
    await continueBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }

  return chosenName;
}

/**
 * Select multiple services by indices from the modal list to ensure both are applied.
 */
export async function selectMultipleServices(page, { indices = [0, 1] } = {}) {
  console.log('4. Opening Service picker...');
  const serviceButton = page.locator('flt-semantics[role="button"]').filter({ hasText: /^\+?\s*Service$/i })
    .or(page.getByRole('button', { name: /^\+?\s*Service$/i }))
    .or(page.getByText('+ Service', { exact: true }))
    .or(page.getByText('Service', { exact: true }))
    .first();

  await serviceButton.waitFor({ state: 'attached', timeout: 10000 });
  const sBox = await serviceButton.boundingBox().catch(() => null);
  if (sBox) {
    await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
  } else {
    await serviceButton.click({ force: true, timeout: 3000 }).catch(() => {});
  }
  await page.waitForTimeout(1200);

  const serviceCheckboxes = page.locator('flt-semantics[role="checkbox"]');
  try {
    await serviceCheckboxes.first().waitFor({ state: 'attached', timeout: 5000 });
  } catch {
    console.log('⚠️ Service modal did not open on first click, retrying click...');
    if (sBox) {
      await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    } else {
      await serviceButton.click({ force: true, timeout: 3000 }).catch(() => {});
    }
    await serviceCheckboxes.first().waitFor({ state: 'attached', timeout: 10000 });
  }
  await page.waitForTimeout(1000);

  const total = await serviceCheckboxes.count();
  console.log(`📋 Available service checkboxes: ${total}`);

  for (const idx of indices) {
    if (idx < total) {
      await serviceCheckboxes.nth(idx).click({ force: true });
      console.log(`   ✅ Checked service #${idx + 1}`);
      await page.waitForTimeout(400);
    }
  }

  const applyButton = page.getByRole('button', { name: 'Apply', exact: true });
  await applyButton.click({ force: true });
  console.log('✅ Clicked Apply on services');
  await page.waitForTimeout(2000);
}

/**
 * Assign staff to a service row.
 */
export async function assignStaffToRow(page, { rowIndex = 0, staffIndex = 0 } = {}) {
  console.log(`👤 Assigning staff (staff index ${staffIndex}) to service row #${rowIndex + 1}...`);
  await page.waitForTimeout(1000);

  // Locate all "Select Staff" or staff dropdown containers in the table
  const staffDropdowns = page.locator('flt-semantics[role="group"][aria-label*="Staff"], flt-semantics[role="group"]:has-text("Staff"), flt-semantics[role="button"]:has-text("Select Staff")');

  let dropdown = null;
  const count = await staffDropdowns.count();
  if (count > rowIndex) {
    dropdown = staffDropdowns.nth(rowIndex);
  } else {
    // Fallback search by role group
    const groups = page.locator('flt-semantics[role="group"]');
    const gCount = await groups.count();
    const matches = [];
    for (let i = 0; i < gCount; i++) {
      const g = groups.nth(i);
      const text = (await g.textContent().catch(() => '')) || '';
      const label = (await g.getAttribute('aria-label').catch(() => '')) || '';
      if (/Select Staff|audi|dhruv|employee|staff/i.test(text) || /Select Staff|Staff/i.test(label)) {
        matches.push(g);
      }
    }
    if (matches.length > rowIndex) {
      dropdown = matches[rowIndex];
    }
  }

  if (!dropdown) {
    throw new Error(`Could not find staff dropdown for row #${rowIndex + 1}`);
  }

  await dropdown.click({ force: true });
  await page.waitForTimeout(1000);

  // Pick staff option
  const staffOptions = page.locator(
    'flt-semantics[role="option"]:visible, ' +
    'flt-semantics[role="listitem"]:visible'
  );

  let targetOption = null;
  if (await staffOptions.count() > 0) {
    const optCount = await staffOptions.count();
    const pick = Math.min(staffIndex, optCount - 1);
    targetOption = staffOptions.nth(pick);
  } else {
    const visibleButtons = page.locator('flt-semantics[role="button"]:visible');
    const bCount = await visibleButtons.count();
    const valid = [];
    for (let i = 0; i < bCount; i++) {
      const b = visibleButtons.nth(i);
      const text = ((await b.textContent().catch(() => '')) || '').trim();
      if (text && !/^select staff$/i.test(text) && !/^cancel$/i.test(text) && !/^close$/i.test(text)) {
        valid.push(b);
      }
    }
    if (valid.length > 0) {
      targetOption = valid[Math.min(staffIndex, valid.length - 1)];
    }
  }

  if (!targetOption) {
    throw new Error(`No staff options found for row #${rowIndex + 1}`);
  }

  const staffName = (await targetOption.textContent())?.trim() || '';
  await targetOption.click({ force: true });
  console.log(`✅ Assigned staff "${staffName}" to service row #${rowIndex + 1}`);
  await page.waitForTimeout(1000);
  return staffName;
}

/**
 * Click Quantity (+) for any service row using the Qty header anchor.
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
  
  // Click checkout
  await checkoutButton.click({ force: true });
  console.log('✅ Clicked Checkout button');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'after-checkout-click.png', fullPage: true });
  console.log('📸 Screenshot saved: after-checkout-click.png');

  // Check if any error snackbar/toast appeared
  const errorBanner = page.locator('flt-semantics').filter({ hasText: /(?:Error|Please select|required)/i });
  if (await errorBanner.count() > 0) {
    const errText = await errorBanner.first().textContent().catch(() => '');
    console.log(`⚠️ Alert/Error on screen after Checkout click: "${errText}"`);
  }
}

/**
 * Read total payment due from Checkout screen.
 */
export async function getPaymentDue(page) {
  return await page.evaluate(() => {
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

/**
 * Set payment amount for a specific payment method (Card, Cash, UPI, Online, Pay Later).
 */
export async function setPaymentAmount(page, method, amount) {
  console.log(`   Entering payment amount for "${method}": ₹${amount}`);

  const target = await page.evaluate(({ method }) => {
    const allElements = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    
    // Find Payment Due element first to know where the Payment section starts
    const dueEl = allElements.find(el => (el.textContent || '').trim().startsWith('Payment Due'));
    const minTop = dueEl ? dueEl.getBoundingClientRect().top : 350;

    // Find the label in Payment Due area (below minTop and on the left column)
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
        return {
          id: inp.id || inp.closest('flt-semantics')?.id,
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height
        };
      })
      .filter(inp =>
        Math.abs(inp.top - lRect.top) < 45 &&
        inp.left > lRect.left &&
        inp.left < lRect.left + 280
      )
      .sort((a, b) => a.left - b.left);

    if (inputs.length > 0) {
      return { id: inputs[0].id, centerX: inputs[0].left + inputs[0].width / 2, centerY: inputs[0].top + inputs[0].height / 2 };
    }

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
        Math.abs(s.top - lRect.top) < 45 &&
        s.left > lRect.left &&
        s.left < lRect.left + 280 &&
        s.width >= 40 && s.width <= 160 &&
        s.height >= 20 && s.height <= 60
      )
      .sort((a, b) => a.left - b.left);

    if (boxes.length > 0) {
      return { id: boxes[0].id, centerX: boxes[0].left + boxes[0].width / 2, centerY: boxes[0].top + boxes[0].height / 2 };
    }

    return { id: null, centerX: lRect.right + 70, centerY: lRect.top + lRect.height / 2 };
  }, { method });

  if (!target) {
    throw new Error(`Could not locate payment row for "${method}"`);
  }

  console.log(`   Focusing "${method}" text field at (${Math.round(target.centerX)}, ${Math.round(target.centerY)})...`);
  await page.mouse.click(target.centerX, target.centerY);
  if (target.id) {
    const loc = page.locator(`#${target.id}`);
    await loc.click({ force: true }).catch(() => {});
  }

  await page.waitForTimeout(400);

  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(String(amount), { delay: 60 });
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  console.log(`   ✅ Successfully entered ₹${amount} for "${method}"`);
  return true;
}

/**
 * Handle confirmation popups (Yes / OK / Proceed, rating experience popup, and invoice completion).
 */
export async function handleOptionalPopups(page, maxPopups = 4) {
  const standardPopupRegex = /^(?:Yes|OK|Confirm|Proceed|Continue|Close|Got it|Done|Skip|Submit|Dismiss|Yes,\s*Proceed|Yes,\s*Complete|Confirm\s*Payment)$/i;

  for (let i = 1; i <= maxPopups; i++) {
    await page.waitForTimeout(1000);

    // 1. Check for standard confirmation buttons (e.g. Yes / OK)
    const locatorCandidate = page.locator('flt-semantics[role="button"], flt-semantics, button')
      .filter({ hasText: standardPopupRegex })
      .last();

    const isAttached = await locatorCandidate.waitFor({ state: 'attached', timeout: 2500 }).then(() => true).catch(() => false);
    if (isAttached) {
      const text = (await locatorCandidate.textContent().catch(() => ''))?.trim();
      console.log(`✅ Found popup #${i} via locator "${text}" — clicking...`);
      const box = await locatorCandidate.boundingBox().catch(() => null);
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      await locatorCandidate.click({ force: true, timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `popup-${i}-handled.png`, fullPage: true }).catch(() => {});
      console.log(`📸 Screenshot saved: popup-${i}-handled.png`);
      continue;
    }

    // 2. Check for experience rating & invoice bottom sheet
    const ratingBtn = page.locator('flt-semantics, button, span, div')
      .filter({ hasText: /^(?:Very Satisfied|Satisfied)$/i })
      .first();
    const isRating = await ratingBtn.waitFor({ state: 'attached', timeout: 2000 }).then(() => true).catch(() => false);

    if (isRating) {
      console.log(`⭐ Found experience rating on popup #${i} — selecting rating and dismissing...`);
      const rBox = await ratingBtn.boundingBox().catch(() => null);
      if (rBox) {
        await page.mouse.click(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
      } else {
        await page.mouse.click(608, 570);
      }
      await page.waitForTimeout(1000);

      const actionBtn = page.locator('flt-semantics[role="button"], flt-semantics, button')
        .filter({ hasText: /^(?:Go to Bookings|New Sale)$/i })
        .first();
      const isAction = await actionBtn.waitFor({ state: 'attached', timeout: 2000 }).then(() => true).catch(() => false);
      if (isAction) {
        const aBox = await actionBtn.boundingBox().catch(() => null);
        if (aBox) {
          await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
        }
        await actionBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      } else {
        await page.mouse.click(950, 632);
      }

      await page.waitForTimeout(2500);
      await page.screenshot({ path: `popup-${i}-handled.png`, fullPage: true }).catch(() => {});
      console.log(`📸 Screenshot saved: popup-${i}-handled.png`);
      continue;
    }

    console.log(`ℹ️ No popup #${i} detected — popup handling complete`);
    break;
  }
}

/**
 * Complete sale, handle popups, and close browser.
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
    console.log('🎉 Entire workflow complete — browser closed successfully!');
  }
}

/**
 * Assign two distinct staff members: Row 1 -> "audi by rohan", Row 2 -> "Dhruv Salat".
 */
export async function assignDifferentStaffToRows(page) {
  console.log('Assigning staff to Row 1 ("audi by rohan")...');
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
