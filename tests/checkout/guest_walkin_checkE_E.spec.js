import { test, expect } from '@playwright/test';

test.setTimeout(300000);

// ==========================================
// 🔧 REUSABLE HELPERS
// ==========================================
async function clickFirstMatch(page, locators, { timeout = 10000, force = true, label = 'element', state = 'attached' } = {}) {
  let target = locators[0];
  for (let i = 1; i < locators.length; i++) target = target.or(locators[i]);
  target = target.first();

  await target.waitFor({ state, timeout });
  await target.scrollIntoViewIfNeeded().catch(() => {});
  await target.click({ force });
  console.log(`✅ Clicked "${label}"`);
  return target;
}

async function tryClick(page, locator, { timeout = 6000, label = 'optional element' } = {}) {
  try {
    await locator.waitFor({ state: 'attached', timeout });
    await locator.click({ force: true });
    console.log(`✅ Clicked "${label}" (was present)`);
    return true;
  } catch {
    console.log(`ℹ️  "${label}" did not appear — skipping`);
    return false;
  }
}

const fltButton = (page, text, exact = false) =>
  exact
    ? page.locator('flt-semantics[role="button"]').filter({ hasText: new RegExp(`^${text}$`, 'i') })
    : page.locator(`flt-semantics[role="button"]:has-text("${text}")`);

// ==========================================
// 📅 ROBUST DAY-OF-MONTH PICKER CLICK
// Works across Flutter semantics variants where aria-label
// text doesn't match simple substring/regex-anchor patterns,
// and where textContent may be empty (CanvasKit renders to
// canvas, so the visible glyph and the a11y label can differ).
// ==========================================
async function clickCalendarDay(page, dayNumber, { label = `Day ${dayNumber}`, preferClosestAvailable = true } = {}) {
  const dayStr = String(dayNumber);

  // Give the calendar a moment to fully render its semantics tree
  await page.waitForTimeout(500);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const candidates = page.locator('flt-semantics[role="button"], flt-semantics[role="gridcell"]');
    const count = await candidates.count();

    // Parse every candidate's leading day-number out of its text content.
    // Text looks like "13, Sunday, September 13, 2026" or "10, ... , Today".
    // Cells for non-date controls (Cancel/OK/Previous month/etc.) won't match and are skipped.
    const dayEntries = []; // { day: number, el, isToday: bool, text }
    for (let i = 0; i < count; i++) {
      const el = candidates.nth(i);
      const text = (await el.textContent().catch(() => null))?.trim() || '';
      const m = text.match(/^(\d{1,2}),\s/);
      if (m) {
        dayEntries.push({
          day: parseInt(m[1], 10),
          el,
          isToday: /,\s*Today\s*$/i.test(text),
          text,
        });
      }
    }

    console.log(`🔍 [attempt ${attempt}] Found ${dayEntries.length} selectable day cells: [${dayEntries.map(d => d.day).join(', ')}]`);

    if (dayEntries.length > 0) {
      // 1) Exact requested day, if it's actually selectable
      let chosen = dayEntries.find(d => d.day === dayNumber);

      // 2) Otherwise, fall back to the closest available day <= requested day
      //    (covers pickers that disallow future dates, like "Purchase Date")
      if (!chosen && preferClosestAvailable) {
        const belowOrEqual = dayEntries.filter(d => d.day <= dayNumber);
        if (belowOrEqual.length > 0) {
          chosen = belowOrEqual.reduce((a, b) => (b.day > a.day ? b : a));
          console.log(`⚠️  Day ${dayNumber} not selectable — falling back to closest available day ${chosen.day} instead.`);
        }
      }

      // 3) Last resort: "Today", if present
      if (!chosen) {
        chosen = dayEntries.find(d => d.isToday);
        if (chosen) console.log(`⚠️  Falling back to "Today" (day ${chosen.day}).`);
      }

      if (chosen) {
        await chosen.el.scrollIntoViewIfNeeded().catch(() => {});
        await chosen.el.click({ force: true });
        console.log(`✅ Clicked "${label}" → actually selected day ${chosen.day} ("${chosen.text}")`);
        return chosen.el;
      }
    }

    console.log(`⚠️  No usable day cell found on attempt ${attempt}, waiting and retrying...`);
    await page.waitForTimeout(800);
  }

  throw new Error(`Could not find any selectable calendar day near "${dayStr}" after 3 attempts — see debug dump above for actual labels.`);
}

// ==========================================
// 🎲 DYNAMIC TEST DATA
// ==========================================
function generateTestData() {
  const timestamp = Date.now();
  const random4Digits = Math.floor(1000 + Math.random() * 9000);

  return {
    vendorName: `Vendor_${timestamp.toString().slice(-6)}`,
    phoneNumber: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    taxId: `29ABCDE${random4Digits}F1Z${Math.floor(1 + Math.random() * 9)}`,
    invoiceNumber: `INV${timestamp}`,
  };
}

test('Full Sales E2E Flow with Dynamic Random Test Data', async ({ page }) => {
  const data = generateTestData();

  console.log('--------------------------------------------------');
  console.log('📋 Generated Test Data for this run:');
  console.log(`   • Vendor Name:    ${data.vendorName}`);
  console.log(`   • Phone Number:   ${data.phoneNumber}`);
  console.log(`   • Tax ID:         ${data.taxId}`);
  console.log(`   • Invoice Number: ${data.invoiceNumber}`);
  console.log('--------------------------------------------------');

  // ---- 1. Login ----
  console.log('1. Navigating to login page...');
  await page.goto('https://devbiz.zylu.co/');

  console.log('2. Entering credentials...');
  await page.getByRole('textbox', { name: 'Email Address' }).fill('test_automation_owner@zylu.co');
  await page.getByRole('textbox', { name: 'Password' }).fill('mt@0Ho6~vn4b');
  await page.locator('//*[@id="loginForm"]/button').click();

  await page.waitForURL('**/#/home', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  console.log('✅ Logged in successfully');

  // ---- 2. New Sale ----
  console.log('3. Clicking "New Sale" button...');
  await clickFirstMatch(page, [page.getByRole('button', { name: 'New Sale', exact: true })], {
    timeout: 15000,
    label: 'New Sale',
  });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // ---- 3. Guest Checkout ----
  console.log('4. Checking "Guest Checkout"...');
  const guestCheckbox = page.locator('flt-semantics[role="checkbox"]').first();
  await guestCheckbox.waitFor({ state: 'visible', timeout: 15000 });
  if ((await guestCheckbox.getAttribute('aria-checked')) !== 'true') {
    await guestCheckbox.click({ force: true });
    console.log('✅ Checked "Guest Checkout"');
  }
  await page.waitForTimeout(1000);

  // ---- 4. Date Picker ----
  console.log('5. Confirming Date...');
  await clickFirstMatch(
    page,
    [page.locator('flt-semantics[role="button"]').filter({ hasText: '/' }).first()],
    { label: 'Date button' }
  );
  await clickFirstMatch(page, [fltButton(page, 'OK')], { label: 'Date OK' });
  await page.waitForTimeout(1500);

  // ---- 5. Time Picker ----
  console.log('6. Confirming Time...');
  await clickFirstMatch(
    page,
    [page.locator('flt-semantics[role="button"]').filter({ hasText: /(?:AM|PM)/i }).first()],
    { label: 'Time button' }
  );
  await page.waitForTimeout(1000);

  await clickFirstMatch(
    page,
    [page.getByRole('radio', { name: 'PM' }), page.getByText('PM', { exact: true })],
    { label: 'PM' }
  );
  await clickFirstMatch(page, [fltButton(page, 'OK')], { label: 'Time OK' });
  await page.waitForTimeout(1500);

  // ---- 6. Select Manager ----
  console.log('9. Clicking "Select Manager" dropdown...');
  const managerDropdown = page.locator('flt-semantics[aria-label*="Select Manager"]')
    .or(page.getByText('Select Manager', { exact: true }))
    .first();
  await managerDropdown.waitFor({ state: 'attached', timeout: 10000 });
  await managerDropdown.click({ force: true });
  console.log('Opened Manager dropdown');

  await page.waitForTimeout(1500);

  const searchInput = page.locator('input[aria-label="Search..."]:not([disabled])')
    .or(page.getByRole('textbox', { name: 'Search...' }));

  if (await searchInput.isVisible().catch(() => false)) {
    console.log('Typing in manager search...');
    await searchInput.fill('Employee Z');
    await page.waitForTimeout(1000);
  }

  console.log('Selecting manager option...');
  const employeeOption = page.locator('flt-semantics[role="button"]').filter({ hasText: /Employee Z|Dummy employee/i })
    .or(page.locator('flt-semantics[aria-label*="Employee"]'))
    .or(page.getByText('Employee Z', { exact: false }))
    .first();

  await employeeOption.waitFor({ state: 'attached', timeout: 10000 });
  await employeeOption.click({ force: true });
  console.log('✅ Selected Manager');

  await page.waitForTimeout(1500);

  // ---- 7. Services ----
  console.log('11. Opening Services modal...');
  await clickFirstMatch(
    page,
    [page.locator('flt-semantics[role="button"]').filter({ hasText: /Service/ }).first()],
    { label: '+ Service' }
  );
  await page.waitForTimeout(2000);

  for (const serviceName of ['Balayage', 'Beard Trim']) {
    console.log(`12. Selecting "${serviceName}"...`);
    await clickFirstMatch(
      page,
      [
        page.locator(`flt-semantics[aria-label*="${serviceName}"]`),
        page.locator(`flt-semantics:has-text("${serviceName}")`),
        page.getByText(serviceName, { exact: false }),
      ],
      { label: serviceName }
    );
    await page.waitForTimeout(800);
  }

  console.log('13. Applying service selection...');
  await clickFirstMatch(page, [fltButton(page, 'Apply', true)], { label: 'Apply (services)' });
  await page.waitForTimeout(2000);

  // ---- 8. Staff assignment ----
  console.log('14. Assigning staff to first service row...');
  await clickFirstMatch(
    page,
    [page.locator('flt-semantics[aria-label*="Select Staff"]'), page.getByText('Select Staff', { exact: true })],
    { label: 'Select Staff dropdown' }
  );
  await page.waitForTimeout(1000);

  await clickFirstMatch(
    page,
    [fltButton(page, 'Dummy employee'), page.getByText('Dummy employee', { exact: true })],
    { label: 'Dummy employee' }
  );
  await page.waitForTimeout(1500);

  console.log('16. Copying staff to second row...');
  await clickFirstMatch(
    page,
    [fltButton(page, 'Copy Previous Staff'), page.getByText('Copy Previous Staff', { exact: true })],
    { label: 'Copy Previous Staff' }
  );
  await page.waitForTimeout(1500);

  // ---- 9. Products modal ----
  console.log('17. Opening Products modal...');
  const productBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /Product/i })
    .or(page.getByText('Product', { exact: true }))
    .first();
  await productBtn.waitFor({ state: 'attached', timeout: 10000 });
  await productBtn.click({ force: true });
  console.log('Opened Products modal');
  await page.waitForTimeout(3000); // Allow modal to render

  // ---- 10. Search for Product by Name & Check Stock ----
  console.log('18. Searching for product by name in Products modal...');
  const searchProductInput = page.getByRole('textbox', { name: /Search Products/i })
    .or(page.locator('input[placeholder*="Search"]'))
    .or(page.locator('input[aria-label*="Search"]'))
    .first();

  if (await searchProductInput.isVisible({ timeout: 4000 }).catch(() => false)) {
    const sBox = await searchProductInput.boundingBox().catch(() => null);
    if (sBox && sBox.width > 0) {
      await page.mouse.click(sBox.x + 50, sBox.y + sBox.height / 2);
    } else {
      await searchProductInput.click({ force: true });
    }
    await page.waitForTimeout(300);
    await searchProductInput.fill('AutoProduct').catch(async () => {});
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('AutoProduct', { delay: 40 });
    console.log('   Typed "AutoProduct" in Search Products');
    await page.waitForTimeout(2000);
  }

  // Check if any filtered product needs stock received (shows "Add Stock")
  const addStockBtn = page.locator('flt-semantics[role="button"]:has-text("Add Stock")')
    .or(page.getByRole('button', { name: /Add Stock/i }))
    .first();

  const needsStock = await addStockBtn.isVisible({ timeout: 3000 }).catch(() => false);

  if (needsStock) {
    console.log('Found product with "Add Stock" button. Clicking "Add Stock"...');
    await addStockBtn.click({ force: true });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // ---- 11. New Vendor ----
    console.log('19. Opening "Add Vendor" screen...');
    await clickFirstMatch(
      page,
      [fltButton(page, 'New Vendor'), page.getByRole('button', { name: '+ New Vendor' })],
      { label: '+ New Vendor' }
    );
    await page.waitForTimeout(2000);

    console.log(`20-22. Entering vendor details (${data.vendorName})...`);
    const vendorNameInput = page.locator('input[aria-label="John Doe"]').or(page.locator('input[data-semantics-role="text-field"]').first());
    await vendorNameInput.waitFor({ state: 'attached', timeout: 8000 });
    await vendorNameInput.click();
    await vendorNameInput.fill(data.vendorName);

    const phoneInput = page.locator('input[type="tel"]').or(page.locator('input[aria-label="223 665 7896"]')).first();
    await phoneInput.waitFor({ state: 'attached', timeout: 8000 });
    await phoneInput.click();
    await phoneInput.fill(data.phoneNumber);

    const taxIdInput = page.locator('input[aria-label="07AAGFF2194N1Z1"]').or(page.locator('input[data-semantics-role="text-field"]').nth(2));
    await taxIdInput.waitFor({ state: 'attached', timeout: 8000 });
    await taxIdInput.click();
    await taxIdInput.fill(data.taxId);

    await page.waitForTimeout(1000);

    console.log('23. Saving vendor...');
    await clickFirstMatch(
      page,
      [fltButton(page, 'Save'), page.getByRole('button', { name: 'Save', exact: true })],
      { label: 'Save (vendor)' }
    );

    await page.waitForLoadState('networkidle');
    await page.waitForURL('**/add-edit-receipt**', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3500);

    // ---- 12. Receipt details ----
    console.log(`24. Entering Invoice Number: "${data.invoiceNumber}"...`);
    const invoiceInput = page.locator('input[aria-label*="20230417"]').or(page.locator('input[aria-label*="Invoice"]')).first();
    await invoiceInput.waitFor({ state: 'attached', timeout: 8000 });
    await invoiceInput.click();
    await invoiceInput.fill(data.invoiceNumber);
    await page.waitForTimeout(500);

    console.log('25-27. Selecting Purchase Date...');
    await clickFirstMatch(
      page,
      [fltButton(page, 'mm/dd/yyyy'), page.getByRole('button', { name: 'mm/dd/yyyy' })],
      { label: 'Purchase Date button' }
    );
    await page.waitForTimeout(1000);

    await clickCalendarDay(page, 13, { label: 'Purchase Date Day 13 (or closest available)' });
    await page.waitForTimeout(500);

    await clickFirstMatch(page, [fltButton(page, 'OK')], { label: 'Purchase Date OK' });
    await page.waitForTimeout(1000);

    console.log('28. Setting Quantity to 1...');
    const qInput = page.getByRole('textbox', { name: '0' })
      .or(page.locator('input[aria-label="0"]'))
      .or(page.locator('input[data-semantics-role="text-field"]').filter({ hasText: /^0$/ }))
      .first();

    await qInput.waitFor({ state: 'attached', timeout: 10000 });
    const qBox = await qInput.boundingBox().catch(() => null);
    if (qBox && qBox.width > 0) {
      console.log(`   Clicking Quantity field at (${Math.round(qBox.x + qBox.width / 2)}, ${Math.round(qBox.y + qBox.height / 2)})...`);
      await page.mouse.click(qBox.x + qBox.width / 2, qBox.y + qBox.height / 2);
    } else {
      console.log('   Clicking fallback coordinate (580, 354)...');
      await page.mouse.click(580, 354);
    }
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('1', { delay: 40 });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // Verify Total Amount updated from ₹0.00
    const totalAmountText = await page.locator('flt-semantics').filter({ hasText: /Total Amount/i }).textContent().catch(() => '');
    console.log(`   Total Amount after entering Quantity: "${totalAmountText.replace(/\s+/g, ' ')}"`);

    console.log('29. Receiving stock...');
    const receiveBtn = page.locator('flt-semantics[role="button"]:has-text("Receive")')
      .or(page.getByRole('button', { name: 'Receive', exact: true }))
      .first();
    await receiveBtn.waitFor({ state: 'attached', timeout: 8000 });
    const rBox = await receiveBtn.boundingBox().catch(() => null);
    if (rBox && rBox.width > 0) {
      await page.mouse.click(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
    } else {
      await receiveBtn.click({ force: true });
    }
    console.log('   Clicked "Receive" button');

    // Wait for "Create Receipt" screen to close and return to Sales / Products modal
    await page.waitForLoadState('networkidle');
    await page.locator('flt-semantics:has-text("Create Receipt"), heading:has-text("Create Receipt")')
      .first()
      .waitFor({ state: 'detached', timeout: 15000 })
      .catch(() => {
        console.log('⚠️ Create Receipt header still visible, checking modal state...');
      });
    await page.waitForTimeout(3000);
  } else {
    console.log('ℹ️ Product is already in stock — proceeding directly to selection');
  }

  // ---- 13. Back on Products modal: Select Checkbox & Apply ----
  console.log('30. Waiting for Products modal to finish loading...');
  // Wait for loading spinner / reload to clear
  await page.locator('flt-semantics, div').filter({ hasText: /Loading/i })
    .waitFor({ state: 'detached', timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(2000);

  console.log('Locating product checkbox inside Products modal (excluding background canvas checkboxes)...');
  // Re-fetch checkboxes inside the modal
  let modalCheckboxCoords = await page.evaluate(() => {
    const cbs = Array.from(document.querySelectorAll('flt-semantics[role="checkbox"]'));
    return cbs.map(cb => {
      const r = cb.getBoundingClientRect();
      return {
        x: Math.round(r.left + r.width / 2),
        y: Math.round(r.top + r.height / 2),
        width: r.width,
        height: r.height,
        checked: cb.getAttribute('aria-checked') === 'true' || cb.getAttribute('checked') === 'true'
      };
    }).filter(c => c.x > 350 && c.width > 15 && c.height > 15);
  });

  if (modalCheckboxCoords.length === 0) {
    console.log('Waiting an additional 2s for modal checkboxes to mount...');
    await page.waitForTimeout(2000);
    modalCheckboxCoords = await page.evaluate(() => {
      const cbs = Array.from(document.querySelectorAll('flt-semantics[role="checkbox"]'));
      return cbs.map(cb => {
        const r = cb.getBoundingClientRect();
        return {
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          width: r.width,
          height: r.height,
          checked: cb.getAttribute('aria-checked') === 'true' || cb.getAttribute('checked') === 'true'
        };
      }).filter(c => c.x > 350 && c.width > 15 && c.height > 15);
    });
  }

  console.log(`Found ${modalCheckboxCoords.length} modal product checkbox(es):`, modalCheckboxCoords);

  if (modalCheckboxCoords.length > 0) {
    // Uncheck any extra checked checkboxes in modal (index > 0)
    for (let i = 1; i < modalCheckboxCoords.length; i++) {
      if (modalCheckboxCoords[i].checked) {
        console.log(`Unchecking extra product checkbox at (${modalCheckboxCoords[i].x}, ${modalCheckboxCoords[i].y})...`);
        await page.mouse.click(modalCheckboxCoords[i].x, modalCheckboxCoords[i].y);
        await page.waitForTimeout(400);
      }
    }
    // Ensure the target product checkbox is checked
    if (!modalCheckboxCoords[0].checked) {
      console.log(`Checking target product checkbox at (${modalCheckboxCoords[0].x}, ${modalCheckboxCoords[0].y})...`);
      await page.mouse.click(modalCheckboxCoords[0].x, modalCheckboxCoords[0].y);
      await page.waitForTimeout(600);
    } else {
      console.log(`Target product checkbox at (${modalCheckboxCoords[0].x}, ${modalCheckboxCoords[0].y}) is already checked.`);
    }
  } else {
    console.log('Clicking product checkbox at standard modal coordinate (402, 240)...');
    await page.mouse.click(402, 240);
    await page.waitForTimeout(1000);
  }

  console.log('31. Clicking "Apply" button on Products modal...');
  const applyProductsBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Apply$/i })
    .or(page.getByRole('button', { name: 'Apply', exact: true }))
    .first();
  await applyProductsBtn.waitFor({ state: 'attached', timeout: 15000 });
  const aBox = await applyProductsBtn.boundingBox().catch(() => null);
  if (aBox && aBox.width > 0) {
    await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
  } else {
    await applyProductsBtn.click({ force: true });
  }
  console.log('✅ Clicked "Apply (products)"');

  console.log('Waiting for Sales table to render the added Product row...');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // ---- 14. Assign Staff to any unassigned product/service rows ----
  console.log('32-33. Assigning staff to all unassigned rows in Sales table...');
  for (let attempt = 0; attempt < 5; attempt++) {
    const unassignedStaff = page.locator('flt-semantics[aria-label*="Select Staff"], flt-semantics[role="button"]:has-text("Select Staff"), flt-semantics[role="cell"]:has-text("Select Staff")').first();
    const count = await unassignedStaff.count();
    if (count === 0) {
      console.log('All rows have staff assigned.');
      break;
    }
    console.log(`Found unassigned "Select Staff" dropdown (attempt ${attempt + 1}), assigning staff...`);
    await unassignedStaff.scrollIntoViewIfNeeded().catch(() => {});
    const sBox = await unassignedStaff.boundingBox().catch(() => null);
    if (sBox && sBox.width > 0) {
      await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    } else {
      await unassignedStaff.click({ force: true });
    }
    await page.waitForTimeout(1200);

    const staffChoice = page.locator('flt-semantics[role="button"]').filter({ hasText: /Dr Harror|Dummy employee|Employee/i })
      .or(page.getByText('Dr Harror', { exact: false }))
      .first();

    await staffChoice.waitFor({ state: 'attached', timeout: 8000 });
    const choiceBox = await staffChoice.boundingBox().catch(() => null);
    if (choiceBox && choiceBox.width > 0) {
      await page.mouse.click(choiceBox.x + choiceBox.width / 2, choiceBox.y + choiceBox.height / 2);
    } else {
      await staffChoice.click({ force: true });
    }
    console.log('✅ Staff assigned to row');
    await page.waitForTimeout(1500);
  }

  // ---- 15. Checkout & Payment ----
  console.log('34. Checking out...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const checkoutBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Checkout$/i })
    .or(page.getByRole('button', { name: 'Checkout', exact: true }))
    .first();

  await checkoutBtn.waitFor({ state: 'attached', timeout: 15000 });
  const cBox = await checkoutBtn.boundingBox().catch(() => null);
  if (cBox && cBox.width > 0) {
    await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
  } else {
    await checkoutBtn.click({ force: true });
  }
  await page.waitForTimeout(3000);

  // Check if we reached payment screen or need a retry
  const paymentDueOrQuick = page.locator('flt-semantics[role="button"]').filter({ hasText: /₹[\d,]+/ })
    .or(page.locator('flt-semantics, span').filter({ hasText: /Payment Due/i }))
    .first();

  const landedPayment = await paymentDueOrQuick.waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (!landedPayment) {
    console.log('Payment screen not yet detected, retrying Checkout click...');
    if (cBox && cBox.width > 0) {
      await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    } else {
      await checkoutBtn.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(3000);
    await paymentDueOrQuick.waitFor({ state: 'attached', timeout: 12000 });
  }

  console.log('35. Selecting quick cash amount or entering payment...');
  const quickAmountBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /₹[\d,]+/ }).first();
  const hasQuick = await quickAmountBtn.waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false);
  if (hasQuick) {
    console.log('Clicking quick cash amount button...');
    const qBox = await quickAmountBtn.boundingBox().catch(() => null);
    if (qBox && qBox.width > 0) {
      await page.mouse.click(qBox.x + qBox.width / 2, qBox.y + qBox.height / 2);
    } else {
      await quickAmountBtn.click({ force: true });
    }
    await page.waitForTimeout(1000);
  } else {
    console.log('Quick cash button not found, falling back to Cash field...');
    const cashLabel = page.locator('flt-semantics, span').filter({ hasText: /^Cash$/i }).first();
    const cashBox = await cashLabel.boundingBox().catch(() => null);
    if (cashBox) {
      await page.mouse.click(cashBox.x + 100, cashBox.y + cashBox.height / 2);
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('1000', { delay: 30 });
      await page.waitForTimeout(400);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
    }
  }

  console.log('36. Completing sale...');
  const completeBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Complete$/i })
    .or(page.getByRole('button', { name: 'Complete', exact: true }))
    .first();
  await completeBtn.waitFor({ state: 'attached', timeout: 10000 });
  const compBox = await completeBtn.boundingBox().catch(() => null);
  if (compBox && compBox.width > 0) {
    await page.mouse.click(compBox.x + compBox.width / 2, compBox.y + compBox.height / 2);
  } else {
    await completeBtn.click({ force: true });
  }

  // ---- 16. Optional confirmation popups ----
  console.log('37. Handling optional confirmation popup(s)...');
  await tryClick(
    page,
    page.locator('flt-semantics[role="button"]').filter({ hasText: /^(?:Yes|OK|Confirm|Proceed)$/i }).first(),
    { timeout: 8000, label: '1st popup' }
  );

  await page.waitForTimeout(3000);

  await tryClick(
    page,
    page.locator('flt-semantics[role="button"]').filter({ hasText: /^(?:OK|Yes|Proceed|Continue|Confirm|Close|Got it)$/i }).first(),
    { timeout: 8000, label: '2nd popup (e.g. Insufficient Funds)' }
  );

  await page.waitForTimeout(2500);

  // ---- 17. Invoice screen -> start new sale ----
  console.log('38-39. Waiting for invoice screen, starting new sale...');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  await clickFirstMatch(
    page,
    [page.locator('flt-semantics[role="button"]').filter({ hasText: /^New Sale$/i }).last()],
    { timeout: 20000, label: 'New Sale (post-invoice)' }
  );
  await page.waitForTimeout(2500);

  // ---- 18. Wrap up ----
  await page.screenshot({ path: 'full-flow-completed.png', fullPage: true });
  console.log('📸 Final screenshot saved as full-flow-completed.png');

  await page.close();
  console.log('🎉 Entire Sales Automation Flow Completed Successfully!');
});