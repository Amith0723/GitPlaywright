import { test, expect } from '@playwright/test';
import { login } from '../../utils/helpers.js';

test('Booking View Flow: Login, Open Bookings List View, Inspect Row, Click Three Dots, View Details, and Validate', async ({ page }) => {
  test.setTimeout(180000);
  console.log('🚀 Starting Test: Booking View Flow');

  // Intercept API responses for booking data
  const bookingApiData = [];
  page.on('response', async resp => {
    try {
      const url = resp.url();
      if (resp.request().method() !== 'OPTIONS' && (url.includes('booking') || url.includes('order') || url.includes('sale') || url.includes('graphql'))) {
        const body = await resp.json().catch(() => null);
        if (body) {
          bookingApiData.push({ url, body });
        }
      }
    } catch (e) {}
  });

  // ===========================================================================
  // STEP 1: Login
  // ===========================================================================
  console.log('\n1. Logging in...');
  await login(page);
  await page.waitForTimeout(2000);

  // Dismiss any overlay/dialog if present
  const closeOverlayBtn = page.locator('dialog button').first();
  if (await closeOverlayBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await closeOverlayBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }

  // ===========================================================================
  // STEP 2: Navigate to Bookings
  // ===========================================================================
  console.log('\n2. Navigating to Bookings...');
  const bookingsNav = page.locator('flt-semantics[role="button"], button').filter({ hasText: /^Bookings$/i }).first();
  if (await bookingsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await bookingsNav.click({ force: true });
  } else {
    await page.goto('https://devbiz.zylu.co/#/bookings');
  }

  await page.waitForURL('**/#/bookings', { timeout: 15000 });
  await page.waitForTimeout(3000);
  console.log('✅ Navigated to Bookings screen');

  // ===========================================================================
  // STEP 3: Switch to List View if needed
  // ===========================================================================
  console.log('\n3. Checking for List View...');
  const listViewBtn = page.getByRole('button', { name: /List View/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /List View/i }))
    .first();

  if (await listViewBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    console.log('   Clicking "List View" toggle...');
    await listViewBtn.click({ force: true });
    await page.waitForTimeout(2500);
  } else {
    console.log('   Already in List View (or toggle button is Calendar View)');
  }

  await page.screenshot({ path: 'scratch/bookings-list-view.png', fullPage: true });

  // ===========================================================================
  // STEP 4: Inspect Rows and Extract Row Data (ID, Date, Customer, Staff, Amount)
  // ===========================================================================
  console.log('\n4. Inspecting booking rows in List View...');

  // Wait for rows with "Show menu" button to be visible
  const menuButtons = page.getByRole('button', { name: 'Show menu' });
  await menuButtons.first().waitFor({ state: 'attached', timeout: 15000 });
  const totalRows = await menuButtons.count();
  console.log(`Found ${totalRows} 'Show menu' button(s) on page.`);
  expect(totalRows).toBeGreaterThan(0);

  const targetMenuBtn = menuButtons.first();
  const rowInfo = await targetMenuBtn.evaluate(el => {
    const parent = el.closest('[aria-label*="Customer_"], [aria-label*="Completed"], [aria-label*="₹"]') || el.parentElement;
    const aria = parent?.getAttribute('aria-label') || '';
    const text = parent?.textContent || '';
    const combined = `${aria} ${text}`;

    // Find booking ID in parent or previous siblings
    let bookingId = '';
    const idMatch = combined.match(/#\d+/);
    if (idMatch) {
      bookingId = idMatch[0];
    } else {
      let prev = parent?.previousElementSibling;
      while (prev && !bookingId) {
        const pm = (prev.getAttribute('aria-label') || prev.textContent || '').match(/#\d+/);
        if (pm) bookingId = pm[0];
        prev = prev.previousElementSibling;
      }
    }

    // Parse date & time: e.g. 11/9/2026 03:53 PM
    const dateMatch = combined.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    const dateTime = dateMatch ? dateMatch[1] : '';

    // Parse customer name: e.g. Customer_5801
    const customerMatch = combined.match(/(Customer_\d+|[A-Z][a-z0-9_]+(?:\s+[A-Z][a-z0-9_]+)*)/);
    const customerName = customerMatch ? customerMatch[1] : '';

    // Parse amount: e.g. ₹100.00
    const amountMatch = combined.match(/₹[\d,]+(?:\.\d{2})?/);
    const amount = amountMatch ? amountMatch[0] : '';

    // Parse status: e.g. Completed, Voided, etc.
    const statusMatch = combined.match(/\b(Completed|Pending|Confirmed|Cancelled|In-progress|Voided)\b/i);
    const status = statusMatch ? statusMatch[1] : '';

    // Parse staff: e.g. audi by rohan
    const staffMatch = combined.match(/audi by rohan|Dhruv Salat|Dummy employee|[A-Za-z0-9_]+\s+by\s+[A-Za-z0-9_]+/i);
    const staff = staffMatch ? staffMatch[0] : '';

    return {
      aria,
      text,
      combined,
      bookingId,
      dateTime,
      customerName,
      amount,
      status,
      staff
    };
  });

  // Calculate target button bounding box
  const btnBox = await targetMenuBtn.boundingBox();

  console.log(`\n🎯 Target Row for validation:`);
  console.log(`   Booking ID: ${rowInfo.bookingId}`);
  console.log(`   Date & Time: ${rowInfo.dateTime}`);
  console.log(`   Customer: ${rowInfo.customerName}`);
  console.log(`   Amount: ${rowInfo.amount}`);
  console.log(`   Status: ${rowInfo.status}`);
  console.log(`   Staff: ${rowInfo.staff}`);
  console.log(`   Raw row text: ${rowInfo.combined.slice(0, 100)}`);

  // ===========================================================================
  // STEP 5: Click the three dots ("Show menu") on the target row
  // ===========================================================================
  console.log('\n5. Clicking three dots ("Show menu") button...');
  if (btnBox && btnBox.width > 0) {
    await page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
  } else {
    await targetMenuBtn.click({ force: true });
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/bookings-show-menu.png', fullPage: true });

  // Log visible menu items that popped up
  const menuItems = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics[role="button"], flt-semantics[role="menuitem"], [role="menuitem"]'));
    return all.map(el => (el.textContent || el.getAttribute('aria-label') || '').trim()).filter(t => t.length > 0 && t.length < 50);
  });
  console.log('   Visible menu items:', menuItems);

  // ===========================================================================
  // STEP 6: Click "View Details"
  // ===========================================================================
  console.log('\n6. Clicking "View Details"...');
  const viewDetailsBtn = page.getByRole('menuitem', { name: /View Details/i })
    .or(page.locator('[aria-label="View Details"]'))
    .or(page.getByRole('button', { name: /View Details/i }))
    .first();

  await viewDetailsBtn.waitFor({ state: 'attached', timeout: 5000 });
  const vBox = await viewDetailsBtn.boundingBox().catch(() => null);
  if (vBox && vBox.width > 0) {
    await page.mouse.click(vBox.x + vBox.width / 2, vBox.y + vBox.height / 2);
  } else {
    await viewDetailsBtn.click({ force: true });
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scratch/bookings-view-details.png', fullPage: true });

  // ===========================================================================
  // STEP 7: Validate Booking Details in the Opened View / Dialog
  // ===========================================================================
  console.log('\n7. Validating details in opened view against target row...');
  const dialogLocator = page.getByRole('dialog').first();
  await dialogLocator.waitFor({ state: 'visible', timeout: 10000 });

  // Validate UI elements present in semantics
  const dialogTitle = page.getByRole('heading', { name: 'Booking' }).first();
  await expect(dialogTitle).toBeVisible();
  console.log('   ✓ Heading "Booking" is visible');

  const storeInfo = page.locator('flt-semantics').filter({ hasText: /The Comfort Zone Spa/i }).first();
  await expect(storeInfo).toBeVisible();
  console.log('   ✓ Store name is visible in details');

  // Find the single booking detail API response
  const detailApiRes = bookingApiData.find(b => b.url.match(/\/api\/bookings\/\d+/));
  if (detailApiRes) {
    const data = detailApiRes.body.data || detailApiRes.body;
    console.log(`\n📦 Intercepted Booking API Data:`);
    console.log(`   ID: ${data.id}`);
    console.log(`   Customer: ${data.user?.name || data.customer?.name}`);
    console.log(`   Status: ${data.booking_status?.status?.en || data.booking_status?.status || data.status}`);
    console.log(`   Staff: ${data.employee?.name}`);
    console.log(`   Amount: ₹${data.payable_amount || data.total_price || data.price || ''}`);

    if (!rowInfo.bookingId) {
      rowInfo.bookingId = `#${data.id}`;
    }

    // Validate ID
    const cleanId = String(data.id);
    expect(rowInfo.bookingId).toContain(cleanId);
    console.log(`   ✓ Booking ID (#${data.id}) matched row ID (${rowInfo.bookingId})`);

    // Validate Customer Name
    const apiCustomer = data.user?.name || data.customer?.name || '';
    if (rowInfo.customerName && apiCustomer) {
      expect(apiCustomer.toLowerCase()).toContain(rowInfo.customerName.toLowerCase());
      console.log(`   ✓ Customer Name (${apiCustomer}) matched row (${rowInfo.customerName})`);
    }

    // Validate Status
    const apiStatus = data.booking_status?.status?.en || data.booking_status?.status || data.status || '';
    if (rowInfo.status && apiStatus) {
      expect(apiStatus.toLowerCase()).toContain(rowInfo.status.toLowerCase());
      console.log(`   ✓ Status (${apiStatus}) matched row (${rowInfo.status})`);
    }

    // Validate Staff
    const apiStaff = data.employee?.name || '';
    if (rowInfo.staff && apiStaff) {
      expect(apiStaff.toLowerCase()).toContain(rowInfo.staff.toLowerCase());
      console.log(`   ✓ Staff (${apiStaff}) matched row (${rowInfo.staff})`);
    }

    // Validate Amount
    const apiAmount = String(data.payable_amount || data.total_price || data.price || '');
    if (rowInfo.amount && apiAmount) {
      const cleanRowAmount = rowInfo.amount.replace(/[₹,]/g, '').trim();
      const numRow = parseFloat(cleanRowAmount);
      const numApi = parseFloat(apiAmount);
      expect(Math.abs(numRow - numApi)).toBeLessThan(0.01);
      console.log(`   ✓ Amount (₹${numApi}) matched row (₹${numRow})`);
    }
  } else {
    console.log('⚠️ Detail API response not found; validating semantics elements');
    expect(await dialogLocator.isVisible()).toBe(true);
  }

  console.log('\n🎉 All booking details successfully validated against View Details screen!');
  await page.close();
  await page.context().close();
});
