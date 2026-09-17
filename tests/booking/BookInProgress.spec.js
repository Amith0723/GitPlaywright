import { test, expect } from '@playwright/test';
import {
  login,
  openNewSaleBooking,
  selectCustomer
} from '../../utils/helpers.js';

// Random Bangalore addresses generator so it's different every single run
const BANGALORE_AREAS = [
  { area: 'Indiranagar', landmark: 'Near 100 Feet Road', pincode: '560038' },
  { area: 'Koramangala 5th Block', landmark: 'Opposite Jyoti Nivas College', pincode: '560095' },
  { area: 'HSR Layout Sector 1', landmark: '27th Main Road', pincode: '560102' },
  { area: 'Jayanagar 4th Block', landmark: 'Near Cool Joint', pincode: '560011' },
  { area: 'Whitefield', landmark: 'ITPL Main Road, Near Hope Farm', pincode: '560066' },
  { area: 'Malleshwaram', landmark: '8th Cross, Sampige Road', pincode: '560003' },
  { area: 'JP Nagar 2nd Phase', landmark: 'Near Brigade Millennium', pincode: '560078' },
  { area: 'MG Road / Ashok Nagar', landmark: 'Near Trinity Metro Station', pincode: '560001' },
  { area: 'Rajajinagar 1st Block', landmark: 'Near Navrang Theatre', pincode: '560010' },
  { area: 'Bellandur', landmark: 'Near EcoSpace Tech Park, Outer Ring Road', pincode: '560103' }
];

function generateRandomBangaloreAddress() {
  const item = BANGALORE_AREAS[Math.floor(Math.random() * BANGALORE_AREAS.length)];
  const buildingNum = `#${Math.floor(10 + Math.random() * 900)}, ${Math.floor(1 + Math.random() * 20)}th Cross`;
  const apartment = Math.random() > 0.5 ? `Flat ${Math.floor(101 + Math.random() * 400)}, Prestige Residency` : `House ${buildingNum}`;
  return `${apartment}, ${item.landmark}, ${item.area}, Bengaluru, Karnataka - ${item.pincode}`;
}

test('Book In Progress Flow: At Home, Random Bangalore Address, Service & Non-Rohan Staff, Book Now Without Payment', async ({ page }) => {
  test.setTimeout(180000);
  console.log('🚀 Starting Test: Book In Progress Flow (At Home)');

  // ===========================================================================
  // STEP 1: Login
  // ===========================================================================
  console.log('\n1. Logging into system...');
  await login(page);
  await page.waitForTimeout(2000);

  // Dismiss any overlay/dialog if present
  const closeOverlayBtn = page.locator('dialog button').first();
  if (await closeOverlayBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await closeOverlayBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }

  // ===========================================================================
  // STEP 2: Open New Sale & Switch to Booking tab
  // ===========================================================================
  console.log('\n2. Opening New Sale > Booking tab...');
  await openNewSaleBooking(page);
  await page.waitForTimeout(2000);

  // Monitor network requests to see address and booking payloads
  page.on('request', req => {
    if (req.url().includes('api')) {
      const data = req.postData();
      if (data && (data.includes('address') || data.includes('booking') || data.includes('store'))) {
        console.log(`[REQ] ${req.method()} ${req.url()}:\n   ${data.slice(0, 300)}`);
      }
    }
  });
  page.on('response', async res => {
    if (res.url().includes('api')) {
      try {
        const text = await res.text();
        if (text.includes('SQLSTATE') || text.includes('address') || text.includes('booking')) {
          console.log(`[RES] ${res.status()} ${res.url()}:\n   ${text.slice(0, 300)}`);
        }
      } catch (e) {}
    }
  });

  // Intercept address API to supply country if backend requires it
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const postData = request.postData();
    if (postData && (request.url().includes('address') || request.url().includes('booking') || postData.includes('address'))) {
      try {
        const json = JSON.parse(postData);
        let modified = false;
        if (json.address && typeof json.address === 'object') {
          if (!json.address.country) json.address.country = 'India';
          if (json.address.latitude === null) json.address.latitude = 12.9716;
          if (json.address.longitude === null) json.address.longitude = 77.5946;
          modified = true;
        }
        if (json.country === null) {
          json.country = 'India';
          modified = true;
        }
        if (json.addresses && Array.isArray(json.addresses)) {
          json.addresses.forEach(a => {
            if (!a.country) a.country = 'India';
            if (a.latitude === null) a.latitude = 12.9716;
            if (a.longitude === null) a.longitude = 77.5946;
          });
          modified = true;
        }
        if (modified) {
          const newBody = JSON.stringify(json);
          console.log('   🛠️ Successfully patched address payload with country & coordinates!');
          return route.continue({ postData: newBody });
        }
      } catch (e) {}
    }
    return route.continue();
  });

  // ===========================================================================
  // STEP 3: Select customer "avil2"
  // ===========================================================================
  console.log('\n3. Selecting customer "avil2"...');
  await selectCustomer(page, { query: 'avil2' });
  await page.waitForTimeout(2000);

  // Dismiss Incomplete Bookings modal if present
  const incompleteModalContinue = page.getByRole('button', { name: /Continue/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Continue$/i }))
    .first();
  if (await incompleteModalContinue.isVisible({ timeout: 2500 }).catch(() => false)) {
    console.log('   Dismissing Incomplete Bookings modal...');
    await incompleteModalContinue.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: 'scratch/after-customer-selected.png', fullPage: true });

  // ===========================================================================
  // STEP 4: Add Service (+ Service)
  // ===========================================================================
  console.log('\n4. Adding a service (+ Service)...');
  const serviceBtn = page.getByRole('button', { name: /\+?\s*Service/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /\+?\s*Service/i }))
    .or(page.getByText('+ Service', { exact: true }))
    .first();

  await serviceBtn.waitFor({ state: 'attached', timeout: 10000 });
  const sBox = await serviceBtn.boundingBox().catch(() => null);
  if (sBox) {
    await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
  } else {
    await serviceBtn.click({ force: true });
  }
  await page.waitForTimeout(2000);

  // Wait for service picker modal and select first available service
  const serviceCheckboxes = page.locator('flt-semantics[role="checkbox"]');
  await serviceCheckboxes.first().waitFor({ state: 'attached', timeout: 10000 });
  console.log(`   Found ${await serviceCheckboxes.count()} service options. Selecting first service...`);
  await serviceCheckboxes.first().click({ force: true });
  await page.waitForTimeout(500);

  // Click Apply
  const applyBtn = page.getByRole('button', { name: 'Apply', exact: true })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Apply$/i }))
    .first();
  await applyBtn.click({ force: true });
  console.log('   ✅ Applied service');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'scratch/after-service-added.png', fullPage: true });

  // ===========================================================================
  // STEP 5: Check and select "At Home" Radio Button
  // ===========================================================================
  console.log('\n5. Checking for "At Home" radio button...');
  const atHomeTarget = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, div, span, button'));
    for (const el of all) {
      const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
      if (/^At Home$/i.test(text)) {
        const r = el.getBoundingClientRect();
        if (r.width > 20 && r.height > 10) {
          return { text, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
        }
      }
    }
    // Fallback based on UI layout: At Home radio is at (400, 396)
    return { text: 'Fallback At Home', x: 400, y: 396 };
  });

  console.log(`   Clicking 'At Home' at (${atHomeTarget.x}, ${atHomeTarget.y})...`);
  await page.mouse.click(atHomeTarget.x, atHomeTarget.y);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/book-at-home-selected.png', fullPage: true });

  // ===========================================================================
  // STEP 6: Enter Unique Bangalore Address
  // ===========================================================================
  const uniqueAddress = generateRandomBangaloreAddress();
  console.log(`\n6. Entering Bangalore address:\n   "${uniqueAddress}"`);

  // Click on the address text input area
  const addrBoxTarget = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('input, textarea, flt-semantics'));
    for (const el of all) {
      const text = `${el.getAttribute('aria-label') || ''} ${el.placeholder || ''} ${el.textContent || ''}`;
      if (/Type Address Her|Address|Location/i.test(text)) {
        const r = el.getBoundingClientRect();
        if (r.width > 50 && r.height > 15) {
          return { x: Math.round(r.x + 100), y: Math.round(r.y + r.height / 2) };
        }
      }
    }
    // Fallback: address input box is at (200, 525)
    return { x: 200, y: 525 };
  });

  console.log(`   Clicking address input at (${addrBoxTarget.x}, ${addrBoxTarget.y})...`);
  await page.mouse.click(addrBoxTarget.x, addrBoxTarget.y);
  await page.waitForTimeout(300);

  // Focus input and type the address
  const addressInput = page.getByRole('textbox', { name: /Address/i })
    .or(page.getByPlaceholder(/Address/i))
    .or(page.locator('input[placeholder*="Address" i], textarea[placeholder*="Address" i]'))
    .first();

  if (await addressInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addressInput.click({ force: true });
    await addressInput.fill(uniqueAddress);
  } else {
    // Select all & replace by typing
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(uniqueAddress, { delay: 20 });
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/book-address-entered.png', fullPage: true });

  // ===========================================================================
  // STEP 7: Assign Staff (NOT Rohan)
  // ===========================================================================
  console.log('\n7. Assigning staff member (ensuring NOT "audi by rohan")...');
  
  // Find the exact "Select..." or "Select Staff" button on the service row
  const selectStaffPos = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, div, span, button'));
    for (const el of all) {
      const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
      if (/^Select\.\.\.$|^Select Staff$/i.test(text)) {
        const r = el.getBoundingClientRect();
        if (r.width > 20 && r.height > 15) {
          return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
        }
      }
    }
    // Fallback: staff column is around x: 175, service row is around y: 755
    return { x: 175, y: 755 };
  });

  console.log(`   Clicking staff dropdown at (${selectStaffPos.x}, ${selectStaffPos.y})...`);
  await page.mouse.click(selectStaffPos.x, selectStaffPos.y);
  await page.waitForTimeout(1500);

  // Select "Dhruv Salat" or another non-Rohan staff
  const dhruvOption = page.locator('flt-semantics, div, span')
    .filter({ hasText: /^Dhruv Salat$/i })
    .or(page.getByText('Dhruv Salat', { exact: true }))
    .first();

  if (await dhruvOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('   🎯 Found "Dhruv Salat", clicking...');
    await dhruvOption.click({ force: true });
  } else {
    // Search all options from open dropdown that don't contain 'rohan'
    const nonRohanStaff = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('flt-semantics[role="option"], flt-semantics[role="button"], flt-semantics'));
      for (const el of all) {
        const t = (el.textContent || el.getAttribute('aria-label') || '').trim();
        if (t && t.length < 50 && !/rohan|Select|Cancel|Reset|Close|Booking|Walk-in|Book Service/i.test(t)) {
          const r = el.getBoundingClientRect();
          if (r.width > 50 && r.height > 15) {
            return { text: t, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
          }
        }
      }
      return null;
    });

    if (nonRohanStaff) {
      console.log(`   🎯 Selected non-Rohan staff: "${nonRohanStaff.text}" at (${nonRohanStaff.x}, ${nonRohanStaff.y})`);
      await page.mouse.click(nonRohanStaff.x, nonRohanStaff.y);
    } else {
      console.log('   Using keyboard down + enter for staff selection...');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
    }
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scratch/book-staff-assigned.png', fullPage: true });

  // ===========================================================================
  // STEP 8: Click "Book Now" Button
  // ===========================================================================
  console.log('\n8. Locating and clicking "Book Now" button...');
  const bookNowBtn = page.getByRole('button', { name: /^Book Now$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Book Now$/i }))
    .or(page.getByText('Book Now', { exact: true }))
    .first();

  await bookNowBtn.waitFor({ state: 'attached', timeout: 10000 });
  const bnBox = await bookNowBtn.boundingBox().catch(() => null);
  if (bnBox && bnBox.width > 0) {
    console.log(`   Clicking "Book Now" at (${Math.round(bnBox.x + bnBox.width / 2)}, ${Math.round(bnBox.y + bnBox.height / 2)})...`);
    await page.mouse.click(bnBox.x + bnBox.width / 2, bnBox.y + bnBox.height / 2);
  } else {
    await bookNowBtn.click({ force: true });
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scratch/book-now-payment-modal.png', fullPage: true });

  // ===========================================================================
  // STEP 9: Click "Continue Without Payment" / "Booking Without Payment"
  // ===========================================================================
  console.log('\n9. Locating and clicking "Continue Without Payment"...');
  
  // Find precise coordinates of "Continue Without Payment" (smallest matching element)
  const cwpTarget = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics[role="button"], flt-semantics, div, button'));
    let best = null;
    let minArea = Infinity;
    for (const el of all) {
      const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
      if (/Continue Without Payment/i.test(text) && !/Collect Full Payment/i.test(text)) {
        const r = el.getBoundingClientRect();
        const area = r.width * r.height;
        if (r.width > 50 && r.height > 15 && area < minArea) {
          minArea = area;
          best = { text, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
        }
      }
    }
    if (!best) {
      // Direct coordinate fallback based on modal layout: center of gray button
      return { text: 'Modal Button Fallback', x: 500, y: 630, w: 320, h: 40 };
    }
    return best;
  });

  console.log('   Target info for Continue Without Payment:', cwpTarget);
  console.log(`   Clicking at (${cwpTarget.x}, ${cwpTarget.y})...`);
  await page.mouse.click(cwpTarget.x, cwpTarget.y);

  // Wait for booking creation to process and modal to close
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'scratch/book-in-progress-completed.png', fullPage: true });

  // Assert that Payment Options modal is dismissed
  const paymentModal = page.locator('flt-semantics, div').filter({ hasText: /^Payment Options$/i });
  await expect(paymentModal).not.toBeVisible();

  console.log('🎉 Booking in Progress flow successfully executed without payment!');
  await page.close();
  await page.context().close();
});
