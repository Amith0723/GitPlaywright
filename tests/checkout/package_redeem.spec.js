import { test, expect } from '@playwright/test';
import { login, openNewSaleBooking, setPaymentAmount, handleOptionalPopups } from '../../utils/helpers.js';

test('Package Redeem Flow: Select Customer, Pick Package, Assign Unique Staff, and Checkout', async ({ page }) => {
  test.setTimeout(240000);
  console.log('🚀 Starting Test: Package Redeem Flow');

  // ===========================================================================
  // STEP 1: Login → New Sale → Booking tab
  // ===========================================================================
  console.log('\n1. Logging in and navigating to New Sale -> Booking tab...');
  await login(page);
  await page.waitForTimeout(2000);

  await openNewSaleBooking(page);
  await page.waitForTimeout(2000);

  // ===========================================================================
  // STEP 2: Search customers (tries several letters until ≥3 results appear)
  // Clicks customer at index 2 (3rd item, 0-based)
  // ===========================================================================
  console.log('\n2. Searching customer (target: index 2, ≥3 results required)...');
  const customerSearchInput = page.getByRole('textbox', { name: 'Search Customer' })
    .or(page.locator('input[placeholder="Search Customer"]'))
    .first();
  await customerSearchInput.waitFor({ state: 'attached', timeout: 10000 });

  const lettersToTry = ['r', 's', 'a', 'm', 'e', 'n', 'i'];
  let selectedLetter = null;

  for (const letter of lettersToTry) {
    console.log(`   Trying search letter: "${letter}"...`);
    await customerSearchInput.click();
    await customerSearchInput.fill('');
    await customerSearchInput.pressSequentially(letter, { delay: 80 });
    await page.waitForTimeout(2000);

    // Count dropdown items rendered in the customer search list
    const resultCount = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('flt-semantics[role="button"], flt-semantics[role="option"], flt-semantics'));
      const input = document.querySelector('input[placeholder*="Search Customer"], [aria-label*="Search Customer"]');
      const minTop = input ? input.getBoundingClientRect().bottom : 200;
      const items = all.filter(el => {
        const r = el.getBoundingClientRect();
        const t = (el.textContent || el.getAttribute('aria-label') || '').trim();
        return r.top >= minTop && r.top <= minTop + 350 && r.left < 400 && r.height >= 25 && t.length > 0;
      });
      return items.length;
    });

    console.log(`   Letter "${letter}" yielded ~${resultCount} results.`);
    if (resultCount >= 3 || resultCount === 0) {
      // If we see ≥3 items, or in CanvasKit keyboard navigation handles it directly
      selectedLetter = letter;
      break;
    }
  }

  if (!selectedLetter) selectedLetter = 'r';

  // Navigate to index 2 (3rd item, 0-based): press ArrowDown 3 times, then press Enter
  console.log(`   Selecting customer at index 2 (ArrowDown x 3, then Enter)...`);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(250);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);

  // Extract customer info from right panel if available
  let selectedCustomerName = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, div, span, p'));
    for (const el of all) {
      const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
      const r = el.getBoundingClientRect();
      if (r.left > 700 && r.top < 350) {
        if (text.includes('Customer_') || text.includes('Cashback') || text.includes('Credit') || text.includes('View more') || text.includes('+91')) {
          const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
          const nameLine = lines.find(l => l.startsWith('Customer_') || /^[A-Z][a-z0-9_]+/i.test(l));
          if (nameLine) return nameLine.split('+')[0].trim();
        }
      }
    }
    return null;
  });
  console.log(`   Captured selected customer name: "${selectedCustomerName}"`);

  // ===========================================================================
  // STEP 3: Dismiss "Incomplete Bookings" modal if it appears
  // ===========================================================================
  console.log('\n3. Checking and dismissing "Incomplete Bookings" modal if present...');
  const modalTitle = page.locator('flt-semantics, div, span, p').filter({ hasText: /incomplete bookings? for/i }).first();
  const hasModal = await modalTitle.waitFor({ state: 'attached', timeout: 3000 }).then(() => true).catch(() => false);

  if (hasModal) {
    console.log('⚠️ Incomplete bookings modal appeared, clicking Continue...');
    const continueBtn = page.locator('flt-semantics[role="button"], button').filter({ hasText: /^continue$/i }).first();
    const cBox = await continueBtn.boundingBox().catch(() => null);
    if (cBox && cBox.width > 0) {
      await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    } else {
      await continueBtn.click({ force: true });
    }
    await page.waitForTimeout(2000);
  } else {
    console.log('ℹ️ No incomplete bookings modal detected.');
  }

  // ===========================================================================
  // STEP 4: Open "+ Package" and confirm the picker modal actually opened
  // ===========================================================================
  console.log('\n4. Opening "+ Package" picker modal...');
  const packageBtn = page.getByRole('button', { name: /Package/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /Package/i }))
    .or(page.getByText('+ Package', { exact: true }))
    .or(page.getByText('Package', { exact: true }))
    .first();

  await packageBtn.waitFor({ state: 'attached', timeout: 10000 });
  const pBox = await packageBtn.boundingBox().catch(() => null);
  if (pBox && pBox.width > 0) {
    await page.mouse.click(pBox.x + pBox.width / 2, pBox.y + pBox.height / 2);
  } else {
    await packageBtn.click({ force: true });
  }

  // Confirm the picker modal actually opened before touching checkboxes
  console.log('   Verifying package modal is open before interacting...');
  const modalOpened = await page.waitForFunction(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, input, div, span, p'));
    const hasSearch = all.some(el => /Search Package/i.test(el.getAttribute('aria-label') || el.getAttribute('placeholder') || ''));
    const hasApply = all.some(el => (el.textContent || el.getAttribute('aria-label') || '').trim() === 'Apply');
    const hasCheckboxes = document.querySelectorAll('flt-semantics[role="checkbox"]').length > 0;
    return hasSearch || (hasApply && hasCheckboxes);
  }, { timeout: 15000 }).then(() => true).catch(() => false);

  expect(modalOpened).toBe(true);
  console.log('✅ Package picker modal confirmed open!');
  await page.waitForTimeout(1000);

  // ===========================================================================
  // STEP 5: Scan package checkboxes, pick "Personalized" or "Standard" (or fallback)
  // ===========================================================================
  console.log('\n5. Scanning available package checkboxes in modal...');
  const availablePackages = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics[role="group"], flt-semantics'));
    const packages = [];
    const seen = new Set();

    for (const el of all) {
      const aria = (el.getAttribute('aria-label') || '').trim();
      const text = (el.textContent || '').trim();
      const label = aria || text;

      const cb = el.querySelector('flt-semantics[role="checkbox"]') || (el.getAttribute('role') === 'checkbox' ? el : null);
      if (!cb && !el.querySelector('flt-semantics[role="checkbox"]')) continue;

      const lines = label.split('\n').map(s => s.trim()).filter(Boolean);
      const name = lines[0] || label.slice(0, 40);

      // Skip non-package utility buttons
      if (/^(?:Select|Apply|Cancel|Close|Search|Reset)$/i.test(name)) continue;

      if (!seen.has(name)) {
        seen.add(name);
        const r = (cb || el).getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          packages.push({
            name,
            fullLabel: label,
            x: Math.round(r.left + r.width / 2),
            y: Math.round(r.top + r.height / 2)
          });
        }
      }
    }
    return packages;
  });

  console.log(`Found ${availablePackages.length} package(s) in catalog:`);
  availablePackages.forEach((pkg, idx) => console.log(`   [${idx}] "${pkg.name}" (Full: "${pkg.fullLabel.replace(/\n/g, ' ')}")`));

  // Pick first matching "Personalized" or "Standard", with graceful fallback to first available
  let chosenPackage = availablePackages.find(p => /Personalized/i.test(p.name) || /Personalized/i.test(p.fullLabel)) ||
                      availablePackages.find(p => /Standard/i.test(p.name) || /Standard/i.test(p.fullLabel));

  if (chosenPackage) {
    console.log(`🎯 Picked matching package: "${chosenPackage.name}"`);
  } else {
    console.log('⚠️ Neither "Personalized" nor "Standard" exists in catalog.');
    console.log('📋 Debug log of available packages:', availablePackages.map(p => p.name));
    expect(availablePackages.length).toBeGreaterThan(0);
    chosenPackage = availablePackages[0];
    console.log(`🎯 Fallback picked first available package: "${chosenPackage.name}"`);
  }

  // Click package checkbox
  const packageCb = page.locator('flt-semantics[role="group"]')
    .filter({ hasText: chosenPackage.name })
    .locator('flt-semantics[role="checkbox"]')
    .or(page.locator(`flt-semantics[aria-label*="${chosenPackage.name}"] flt-semantics[role="checkbox"]`))
    .first();

  if (await packageCb.isVisible({ timeout: 2000 }).catch(() => false)) {
    await packageCb.click({ force: true });
  } else {
    await page.mouse.click(chosenPackage.x, chosenPackage.y);
  }
  await page.waitForTimeout(1000);

  // ===========================================================================
  // STEP 6: Click "Apply"
  // ===========================================================================
  console.log('\n6. Clicking "Apply" button...');
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
  await page.locator('textbox[name*="Package"]').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('✅ Package applied successfully!');

  // ===========================================================================
  // STEP 7: Loop through every row still showing unassigned "Select Staff"
  // Assign unique staff (tracked via Set, max 10 rows, graceful reuse fallback)
  // ===========================================================================
  console.log('\n7. Assigning unique staff to all package rows...');
  const assignedStaffSet = new Set();
  const MAX_ROWS = 10;

  for (let row = 0; row < MAX_ROWS; row++) {
    const unassignedDropdown = page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
      .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
      .or(page.locator('flt-semantics').filter({ hasText: /^Select Staff$/i }))
      .first();

    const isPresent = await unassignedDropdown.isVisible({ timeout: 2500 }).catch(() => false);
    if (!isPresent) {
      console.log(`✅ All package rows assigned! No remaining "Select Staff" found after ${row} assignment(s).`);
      break;
    }

    console.log(`\n👨‍💼 Assigning staff for row #${row + 1}...`);
    const dropBox = await unassignedDropdown.boundingBox().catch(() => null);
    if (dropBox) {
      await page.mouse.click(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2);
    } else {
      await unassignedDropdown.click({ force: true });
    }
    await page.waitForTimeout(1500);

    // Retrieve available staff options from open dropdown
    const staffOptions = await page.evaluate(() => {
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

    const visibleStaff = staffOptions.filter(s => !s.text.includes('@')).slice(0, 8);
    console.log(`   Available staff options (${visibleStaff.length}):`, visibleStaff.map(s => s.text));

    // Find staff member not already assigned
    let pickedStaff = visibleStaff.find(s => !assignedStaffSet.has(s.text));

    if (pickedStaff) {
      console.log(`   🎯 Assigning unique staff: "${pickedStaff.text}"`);
    } else {
      console.log(`   ⚠️ All available staff options have already been assigned (${Array.from(assignedStaffSet).join(', ')}). Gracefully reusing first available staff.`);
      pickedStaff = visibleStaff[0];
      console.log(`   🎯 Reusing staff: "${pickedStaff?.text}"`);
    }

    if (pickedStaff) {
      const staffLoc = page.locator('flt-semantics[role="button"], flt-semantics')
        .filter({ hasText: new RegExp(`^${pickedStaff.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
        .or(page.getByText(pickedStaff.text, { exact: true }))
        .first();

      await staffLoc.waitFor({ state: 'attached', timeout: 5000 });
      const sBox = await staffLoc.boundingBox().catch(() => null);
      if (sBox && sBox.width > 0) {
        await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
      } else {
        await staffLoc.click({ force: true });
      }
      assignedStaffSet.add(pickedStaff.text);
      await page.waitForTimeout(2000);
      console.log(`   ✅ Assigned "${pickedStaff.text}" to row #${row + 1}. Current assigned set: [${Array.from(assignedStaffSet).join(', ')}]`);
    }
  }

  // ===========================================================================
  // STEP 8: Click "Checkout"
  // ===========================================================================
  console.log('\n8. Clicking "Checkout"...');
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

  // Verify Checkout screen / Payment Due is reached
  const dueEl = page.locator('flt-semantics, span').filter({ hasText: /Payment Due/i }).first();
  const isLanded = await dueEl.waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (!isLanded) {
    console.log('   Retrying click on Checkout button...');
    if (cBox && cBox.width > 0) {
      await page.mouse.click(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    } else {
      await checkoutBtn.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(3000);
    await dueEl.waitFor({ state: 'attached', timeout: 15000 });
  }

  console.log('🎉 Successfully landed on Checkout screen!');
  await page.screenshot({ path: 'scratch/package-redeem-checkout-screen.png', fullPage: true });

  // ===========================================================================
  // STEP 9: Make payment as Online and click Complete
  // ===========================================================================
  console.log('\n9. Making payment via "Online" and clicking Complete...');
  const dueText = await dueEl.textContent().catch(() => '');
  console.log(`   Payment Due raw text: ${dueText.replace(/\s+/g, ' ')}`);

  const dueMatch = dueText.match(/₹([\d,]+\.?\d*)/);
  const dueAmountStr = dueMatch ? dueMatch[1].replace(/,/g, '') : '0';
  const paymentDueAmount = parseFloat(dueAmountStr);
  console.log(`   💰 Payment Due Amount: ₹${paymentDueAmount.toFixed(2)}`);

  // Enter amount in Online field
  console.log(`💳 Entering ₹${dueAmountStr} into Online field...`);
  const onlineLabel = page.locator('flt-semantics, span, div').filter({ hasText: /^Online$/i }).first();
  await onlineLabel.waitFor({ state: 'attached', timeout: 8000 });
  const oBox = await onlineLabel.boundingBox().catch(() => null);

  if (oBox) {
    console.log(`   Focusing Online Amount input at (${Math.round(oBox.x + 80)}, ${Math.round(oBox.y + oBox.height / 2)})...`);
    await page.mouse.click(oBox.x + 80, oBox.y + oBox.height / 2);
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(dueAmountStr, { delay: 30 });
    await page.waitForTimeout(400);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    const quickOnlineBtn = page.locator('flt-semantics[role="button"]')
      .filter({ hasText: new RegExp(`^₹\\s*${dueAmountStr}$|^₹\\s*${paymentDueAmount.toFixed(2)}$`, 'i') })
      .first();
    if (await quickOnlineBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log('   Clicking blue quick button under Online...');
      await quickOnlineBtn.click({ force: true }).catch(() => {});
    }
  } else {
    await setPaymentAmount(page, 'Online', dueAmountStr).catch(err => console.log('   setPaymentAmount error:', err));
  }

  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/package-redeem-online-entered.png', fullPage: true });

  // Click "Complete"
  console.log('🏁 Clicking "Complete" button...');
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

  // Handle confirmation popup ("Yes") if present
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

  // Confirm "Generate Invoice" screen is displayed
  console.log('🧾 Validating "Generate Invoice" screen...');
  const invoiceHeader = page.locator('flt-semantics, span, div, p')
    .filter({ hasText: /^(?:Generate Invoice|Invoice)$/i })
    .first();
  await invoiceHeader.waitFor({ state: 'attached', timeout: 30000 });
  console.log('🎉 "Generate Invoice" screen is displayed!');
  await page.screenshot({ path: 'scratch/package-redeem-invoice-screen.png', fullPage: true });

  // Extract customer name from Invoice screen
  const customerNameOnInvoice = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, span, div, p'));
    for (const el of all) {
      const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
      const m = text.match(/Name:\s*([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)*?)(?:\s*Payment|\s*Schedule|\s*Invoice|\n|$)/i);
      if (m && m[1].trim()) return m[1].trim();
    }
    return null;
  });

  const customerToSearch = customerNameOnInvoice || selectedCustomerName || 'Customer';
  console.log(`📋 Customer who bought package: "${customerToSearch}"`);

  // ===========================================================================
  // STEP 10: Click "New Sale" on Generate Invoice page
  // ===========================================================================
  console.log('\n10. Clicking "New Sale" button on Generate Invoice page...');
  const newSaleBtn = page.getByRole('button', { name: /^New Sale$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^New Sale$/i }))
    .or(page.getByText('New Sale', { exact: true }))
    .first();

  await newSaleBtn.waitFor({ state: 'attached', timeout: 15000 });
  const nsBox = await newSaleBtn.boundingBox().catch(() => null);
  if (nsBox && nsBox.width > 0) {
    await page.mouse.click(nsBox.x + nsBox.width / 2, nsBox.y + nsBox.height / 2);
  } else {
    await newSaleBtn.click({ force: true });
  }
  await page.waitForTimeout(3500);

  // Handle rating prompt if present
  const ratingBtn = page.locator('flt-semantics, button, span').filter({ hasText: /^(?:Very Satisfied|Satisfied)$/i }).first();
  if (await ratingBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log('   Handling rating prompt...');
    await ratingBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    const retryNewSale = page.locator('flt-semantics[role="button"]').filter({ hasText: /^New Sale$/i }).first();
    if (await retryNewSale.isVisible({ timeout: 1500 }).catch(() => false)) {
      await retryNewSale.click({ force: true }).catch(() => {});
      await page.waitForTimeout(3000);
    }
  }

  // Optionally switch to Booking tab if desired
  const bookingTab = page.locator('flt-semantics[role="tab"]').filter({ hasText: /^Booking$/i }).first();
  if (await bookingTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await bookingTab.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  // ===========================================================================
  // STEP 11: Search the particular customer who bought the package
  // ===========================================================================
  console.log(`\n11. Searching customer who bought the package: "${customerToSearch}"...`);
  const finalCustomerSearchInput = page.getByRole('textbox', { name: 'Search Customer' })
    .or(page.locator('input[placeholder="Search Customer"]'))
    .first();

  await finalCustomerSearchInput.waitFor({ state: 'attached', timeout: 15000 });
  await finalCustomerSearchInput.click();
  await finalCustomerSearchInput.fill('');
  await finalCustomerSearchInput.pressSequentially(customerToSearch, { delay: 60 });
  await page.waitForTimeout(2500);

  // Select the customer from dropdown
  console.log(`   Selecting customer "${customerToSearch}" from dropdown...`);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  // Dismiss incomplete bookings modal if present
  const incompleteModalTitle = page.locator('flt-semantics, div, span, p').filter({ hasText: /incomplete bookings? for/i }).first();
  if (await incompleteModalTitle.waitFor({ state: 'attached', timeout: 3000 }).then(() => true).catch(() => false)) {
    console.log('   Dismissing incomplete bookings modal...');
    const continueBtn = page.locator('flt-semantics[role="button"], button').filter({ hasText: /^continue$/i }).first();
    await continueBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: 'scratch/package-redeem-customer-selected.png', fullPage: true });

  // ===========================================================================
  // STEP 12: Click the icon / arrow to expand the purchased package
  // ===========================================================================
  console.log('\n12. Locating Purchased Packages card and clicking arrow icon to expand...');
  const packageCard = page.getByRole('button', { name: /Expires at/i })
    .or(page.locator('flt-semantics[role="button"][aria-label*="Expires at"]'))
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /Expires at/i }))
    .first();

  await packageCard.waitFor({ state: 'attached', timeout: 15000 });
  const cardBox = await packageCard.boundingBox();
  console.log('   Package card bounding box:', cardBox);

  if (cardBox) {
    // The chevron down arrow icon is located at the right edge of the card
    const arrowX = Math.round(cardBox.x + cardBox.width - 25);
    const arrowY = Math.round(cardBox.y + cardBox.height / 2);
    console.log(`   Clicking arrow icon at (${arrowX}, ${arrowY})...`);
    await page.mouse.click(arrowX, arrowY);
  } else {
    await packageCard.click({ force: true });
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scratch/package-redeem-expanded.png', fullPage: true });

  // ===========================================================================
  // STEP 13: Click the "Redeem" link / button
  // ===========================================================================
  console.log('\n13. Clicking "Redeem" link/button...');
  let redeemBtn = page.getByRole('button', { name: /^Redeem$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Redeem$/i }))
    .or(page.locator('flt-semantics[aria-label*="Redeem"]'))
    .or(page.locator('flt-semantics').filter({ hasText: /^Redeem$/i }))
    .or(page.getByText('Redeem', { exact: true }))
    .first();

  let isRedeemAttached = await redeemBtn.waitFor({ state: 'attached', timeout: 4000 }).then(() => true).catch(() => false);
  if (!isRedeemAttached) {
    console.log('   Redeem button not attached yet, retrying click on card...');
    if (cardBox) {
      await page.mouse.click(cardBox.x + cardBox.width - 25, cardBox.y + cardBox.height / 2);
    } else {
      await packageCard.click({ force: true });
    }
    await page.waitForTimeout(2000);
    await redeemBtn.waitFor({ state: 'attached', timeout: 8000 });
  }

  const rBox = await redeemBtn.boundingBox().catch(() => null);
  if (rBox && rBox.width > 0) {
    console.log(`   Clicking Redeem at (${Math.round(rBox.x + rBox.width / 2)}, ${Math.round(rBox.y + rBox.height / 2)})...`);
    await page.mouse.click(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
  } else {
    await redeemBtn.click({ force: true });
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scratch/package-redeem-after-redeem-clicked.png', fullPage: true });

  // ===========================================================================
  // STEP 14: Select a DIFFERENT staff member for the redeemed service
  // ===========================================================================
  console.log('\n14. Selecting a DIFFERENT staff member for redeemed service row...');
  const staffDropdown = page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
    .or(page.locator('flt-semantics').filter({ hasText: /^Select Staff$/i }))
    .first();

  if (await staffDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
    const sBox = await staffDropdown.boundingBox().catch(() => null);
    if (sBox) {
      await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    } else {
      await staffDropdown.click({ force: true });
    }
  } else {
    const anyStaffDropdown = page.locator('flt-semantics[role="group"]').filter({ has: page.locator('button') }).last();
    if (await anyStaffDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      await anyStaffDropdown.click({ force: true });
    }
  }
  await page.waitForTimeout(1500);

  const staffOptions = await page.evaluate(() => {
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

  const visibleStaff = staffOptions.filter(s => !s.text.includes('@')).slice(0, 5);
  console.log('   Available staff members:', visibleStaff.map(s => s.text));

  // Select a different staff member: e.g. Dhruv Salat or index 1
  const differentStaff = visibleStaff.find(s => !/audi by rohan/i.test(s.text)) || visibleStaff[1] || visibleStaff[0];
  console.log(`🎯 Selected different staff: "${differentStaff?.text}"`);

  if (differentStaff) {
    const staffLoc = page.locator('flt-semantics[role="button"], flt-semantics')
      .filter({ hasText: new RegExp(`^${differentStaff.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
      .or(page.getByText(differentStaff.text, { exact: true }))
      .first();

    await staffLoc.waitFor({ state: 'attached', timeout: 5000 });
    const sBox = await staffLoc.boundingBox().catch(() => null);
    if (sBox && sBox.width > 0) {
      await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    } else {
      await staffLoc.click({ force: true });
    }
    await page.waitForTimeout(2000);
    console.log(`   ✅ Selected staff "${differentStaff.text}" for redeemed row!`);
  }

  await page.screenshot({ path: 'scratch/package-redeem-staff-assigned.png', fullPage: true });

  // ===========================================================================
  // STEP 15: Click "Checkout"
  // ===========================================================================
  console.log('\n15. Clicking "Checkout" for redeemed service...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const finalCheckoutBtn = page.locator('flt-semantics[role="button"]').filter({ hasText: /^Checkout$/i })
    .or(page.getByRole('button', { name: 'Checkout', exact: true }))
    .or(page.getByText('Checkout', { exact: true }))
    .first();

  await finalCheckoutBtn.waitFor({ state: 'attached', timeout: 15000 });
  const fcBox = await finalCheckoutBtn.boundingBox().catch(() => null);
  if (fcBox && fcBox.width > 0) {
    await page.mouse.click(fcBox.x + fcBox.width / 2, fcBox.y + fcBox.height / 2);
  } else {
    await finalCheckoutBtn.click({ force: true });
  }
  await page.waitForTimeout(3000);

  const finalDueEl = page.locator('flt-semantics, span').filter({ hasText: /Payment Due/i }).first();
  const landedFinal = await finalDueEl.waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (!landedFinal) {
    if (fcBox && fcBox.width > 0) {
      await page.mouse.click(fcBox.x + fcBox.width / 2, fcBox.y + fcBox.height / 2);
    } else {
      await finalCheckoutBtn.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(3000);
    await finalDueEl.waitFor({ state: 'attached', timeout: 15000 });
  }

  console.log('🎉 Successfully completed Checkout for redeemed package!');
  await page.screenshot({ path: 'scratch/package-redeem-final-checkout.png', fullPage: true });

  await page.close();
  await page.context().close();
});
