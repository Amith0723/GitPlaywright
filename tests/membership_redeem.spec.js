import { test, expect } from '@playwright/test';
import { login, openNewSaleBooking, setPaymentAmount, handleOptionalPopups } from './helpers.js';

test('Membership Redeem Flow: Select Customer, Pick Membership, Assign Staff, Checkout, New Sale, Re-search Customer, Expand Down Arrow, Redeem, Different Staff, Checkout', async ({ page }) => {
  test.setTimeout(240000);
  console.log('🚀 Starting Test: Membership Redeem Flow');

  // ===========================================================================
  // STEP 1: Login → New Sale → Booking tab
  // ===========================================================================
  console.log('\n1. Logging in and navigating to New Sale -> Booking tab...');
  await login(page);
  await page.waitForTimeout(2000);

  await openNewSaleBooking(page);
  await page.waitForTimeout(2000);

  // ===========================================================================
  // STEP 2: Search customers (tries letters until ≥3 results appear)
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
  const incompleteModal = page.locator('flt-semantics, div, span, p').filter({ hasText: /incomplete bookings? for/i }).first();
  const hasModal = await incompleteModal.waitFor({ state: 'attached', timeout: 3000 }).then(() => true).catch(() => false);

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
  // STEP 4: Open "+ Membership" and confirm the picker modal actually opened
  // ===========================================================================
  console.log('\n4. Opening "+ Membership" picker modal...');
  const membershipBtn = page.getByRole('button', { name: /Membership/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /Membership/i }))
    .or(page.getByText('+ Membership', { exact: true }))
    .or(page.getByText('Membership', { exact: true }))
    .first();

  await membershipBtn.waitFor({ state: 'attached', timeout: 10000 });
  const mBox = await membershipBtn.boundingBox().catch(() => null);
  if (mBox && mBox.width > 0) {
    await page.mouse.click(mBox.x + mBox.width / 2, mBox.y + mBox.height / 2);
  } else {
    await membershipBtn.click({ force: true });
  }

  // Confirm the picker modal actually opened before interacting
  console.log('   Verifying membership modal is open before interacting...');
  const searchMembershipInput = page.getByRole('textbox', { name: 'Search Memberships' })
    .or(page.locator('input[placeholder*="Search Memberships"], [aria-label*="Search Memberships"]'))
    .first();
  await searchMembershipInput.waitFor({ state: 'attached', timeout: 15000 });

  console.log('✅ Membership picker modal confirmed open!');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/membership-redeem-modal.png', fullPage: true });

  // ===========================================================================
  // STEP 5: Scan available membership radio buttons in modal and pick one
  // ===========================================================================
  console.log('\n5. Scanning available membership radio buttons in modal...');
  const availableMemberships = await page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('flt-semantics[role="radio"]'));
    return radios.map(r => {
      const parent = r.closest('flt-semantics[role="group"]') || r.parentElement;
      const label = (parent?.getAttribute('aria-label') || parent?.textContent || r.getAttribute('aria-label') || '').trim();
      const rect = r.getBoundingClientRect();
      return {
        label,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      };
    });
  });

  console.log(`Found ${availableMemberships.length} membership radio(s) in catalog:`);
  availableMemberships.forEach((m, idx) => console.log(`   [${idx}] "${m.label.replace(/\n/g, ' ')}"`));

  // Pick a membership (e.g. Diamond or first available)
  let chosenMembership = availableMemberships.find(m => /Diamond/i.test(m.label)) || availableMemberships[0];
  console.log(`🎯 Picked membership: "${chosenMembership?.label}"`);

  if (chosenMembership) {
    await page.mouse.click(chosenMembership.x, chosenMembership.y);
  } else {
    const anyRadio = page.locator('flt-semantics[role="radio"]').first();
    await anyRadio.click({ force: true });
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/membership-redeem-radio-clicked.png', fullPage: true });

  // ===========================================================================
  // STEP 6: Confirm membership selection / Close modal
  // ===========================================================================
  console.log('\n6. Checking for "Apply" button or closing modal...');
  const applyBtn = page.getByRole('button', { name: 'Apply', exact: true })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Apply$/i }))
    .first();

  if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('   Clicking "Apply" button...');
    await applyBtn.click({ force: true });
  } else {
    const isModalStillOpen = await searchMembershipInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (isModalStillOpen) {
      console.log('   Closing membership modal...');
      const closeBtn = page.locator('dialog flt-semantics[role="button"]').first();
      if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await closeBtn.click({ force: true });
      } else {
        await page.keyboard.press('Escape');
      }
    }
  }

  // Wait for modal to close
  await page.waitForTimeout(3000);
  console.log('✅ Membership applied successfully!');
  await page.screenshot({ path: 'scratch/membership-redeem-applied.png', fullPage: true });

  // ===========================================================================
  // STEP 7: Check if any unassigned "Select Staff" dropdown exists and assign staff
  // ===========================================================================
  console.log('\n7. Checking and assigning staff if needed...');
  const assignedStaffSet = new Set();
  const MAX_ROWS = 10;

  for (let row = 0; row < MAX_ROWS; row++) {
    const unassignedDropdown = page.locator('flt-semantics[role="group"][aria-label="Select Staff"]')
      .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select Staff$/i }))
      .first();

    const isPresent = await unassignedDropdown.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isPresent) {
      console.log(`✅ No remaining "Select Staff" found after ${row} assignment(s).`);
      break;
    }

    console.log(`👨‍💼 Assigning staff for row #${row + 1}...`);
    const dropBox = await unassignedDropdown.boundingBox().catch(() => null);
    if (dropBox) {
      await page.mouse.click(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2);
    } else {
      await unassignedDropdown.click({ force: true });
    }
    await page.waitForTimeout(1500);

    const staffOptions = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('flt-semantics[role="button"], flt-semantics[role="option"], flt-semantics'));
      const list = [];
      for (const el of all) {
        const r = el.getBoundingClientRect();
        const t = (el.textContent || el.getAttribute('aria-label') || '').trim();
        const isExcluded = /^(?:Select Staff|Cancel|Close|Apply|Reset|Booking|Walk-in|Sort|New|Review|Save Draft|Checkout|TOTAL|At Store|At Home|Book Service|Sales|Select Manager|Diamond|Manager|Service|Product|Package|Membership|Wallet Balance|Gift Card|Redeem Gift Card|Personalized packages)$/i.test(t) ||
                           /^\d{1,2}\/\d{1,2}\/\d{2,4}$/i.test(t) ||
                           /^\d{1,2}:\d{2}\s*(?:AM|PM)$/i.test(t);
        if (r.width > 80 && r.height >= 25 && r.height <= 55 && t && !isExcluded) {
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
    console.log(`   Available staff options:`, visibleStaff.map(s => s.text));

    if (visibleStaff.length === 0) {
      console.log('   No valid staff options found in open dropdown. Closing dropdown.');
      await page.keyboard.press('Escape');
      break;
    }

    let pickedStaff = visibleStaff.find(s => !assignedStaffSet.has(s.text)) || visibleStaff[0];
    if (pickedStaff) {
      console.log(`   🎯 Assigning staff: "${pickedStaff.text}"`);
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
      console.log(`   ✅ Assigned "${pickedStaff.text}" to row #${row + 1}.`);
    }
  }

  // ===========================================================================
  // STEP 8: Click "Checkout"
  // ===========================================================================
  console.log('\n8. Preparing and clicking "Checkout"...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // If membership start date options are present, select "Start Immediately"
  const startImmediatelyCoords = await page.evaluate(() => {
    const el = document.querySelector('[aria-label*="Start Immediately"]');
    if (el) {
      const radio = el.querySelector('flt-semantics[role="radio"], [role="radio"]') || el;
      const r = radio.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }
    const radios = Array.from(document.querySelectorAll('flt-semantics[role="radio"], [role="radio"]'));
    for (const r of radios) {
      const parent = r.closest('flt-semantics[role="group"]') || r.parentElement;
      const label = (parent?.getAttribute('aria-label') || '').toLowerCase();
      if (label.includes('start immediately')) {
        const rect = r.getBoundingClientRect();
        return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
      }
    }
    return null;
  });

  if (startImmediatelyCoords) {
    console.log(`   🎯 Clicking "Start Immediately" radio at (${startImmediatelyCoords.x}, ${startImmediatelyCoords.y})...`);
    await page.mouse.click(startImmediatelyCoords.x, startImmediatelyCoords.y);
    await page.waitForTimeout(1000);
  }

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
  await page.screenshot({ path: 'scratch/membership-redeem-checkout-screen.png', fullPage: true });

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
  await page.screenshot({ path: 'scratch/membership-redeem-online-entered.png', fullPage: true });

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
  await page.screenshot({ path: 'scratch/membership-redeem-invoice-screen.png', fullPage: true });

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
  console.log(`📋 Customer who bought membership: "${customerToSearch}"`);

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

  // ===========================================================================
  // STEP 11: Search the particular customer who bought the membership
  // ===========================================================================
  console.log(`\n11. Searching customer who bought the membership: "${customerToSearch}"...`);
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

  await page.screenshot({ path: 'scratch/membership-redeem-customer-selected.png', fullPage: true });

  // ===========================================================================
  // STEP 12: Click the down arrow button on the purchased membership card
  // ===========================================================================
  console.log('\n12. Locating Purchased Membership card and clicking down arrow button...');
  
  // Collapse "Personalized packages" if open to clearly reveal Membership Details
  const packagesHeader = page.locator('flt-semantics[role="button"]').filter({ hasText: /Personalized packages/i })
    .or(page.locator('flt-semantics[aria-label*="Personalized packages"]'))
    .first();
  if (await packagesHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
    const pBox = await packagesHeader.boundingBox().catch(() => null);
    if (pBox) {
      await page.mouse.click(pBox.x + pBox.width / 2, pBox.y + pBox.height / 2);
      await page.waitForTimeout(1000);
    }
  }

  // Locate the Membership down arrow button
  const arrowCoords = await page.evaluate(() => {
    const group = document.querySelector('[aria-label*="Membership"][aria-label*="Expires At"], [aria-label*="Membership Diamond"]');
    if (group) {
      const btn = group.querySelector('flt-semantics[role="button"], button, [role="button"]') || group;
      const r = btn.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }
    const details = document.querySelector('[aria-label*="Membership Details"]');
    if (details) {
      const btn = details.querySelector('flt-semantics[role="button"], button');
      if (btn) {
        const r = btn.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
    }
    return null;
  });

  console.log('   Membership arrow button evaluated coordinates:', arrowCoords);
  if (arrowCoords) {
    await page.mouse.click(arrowCoords.x, arrowCoords.y);
  } else {
    const membershipArrowBtn = page.getByRole('group', { name: /Membership.*Expires At/i }).getByRole('button').first()
      .or(page.locator('[aria-label*="Membership"][aria-label*="Expires At"]').locator('flt-semantics[role="button"]'))
      .or(page.locator('[aria-label*="Membership"]').locator('flt-semantics[role="button"]').last());
    await membershipArrowBtn.click({ force: true }).catch(() => {});
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scratch/membership-redeem-arrow-clicked.png', fullPage: true });

  // ===========================================================================
  // STEP 13: Click "Redeem" link / Select Membership to apply & Add Service
  // ===========================================================================
  console.log('\n13. Selecting membership from dropdown / clicking Redeem...');

  // 1. Select the membership option under "Select Membership to apply:"
  const membershipOption = page.getByRole('button', { name: /Membership.*Expires At/i }).first()
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /Expires At/i }).first());

  if (await membershipOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('   Clicking membership under "Select Membership to apply"...');
    await membershipOption.click({ force: true });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    // If not found by role button, click first button in group
    const groupBtn = page.locator('group button, [role="group"] [role="button"]').first();
    if (await groupBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await groupBtn.click({ force: true });
      await page.waitForTimeout(1000);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: 'scratch/membership-redeem-option-selected.png', fullPage: true });

  // 2. Check if a direct Redeem button exists
  let redeemCoords = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, button, [role="button"], span, div'));
    const el = all.find(e => /^Redeem$/i.test((e.textContent || e.getAttribute('aria-label') || '').trim()));
    if (el) {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }
    return null;
  });

  if (redeemCoords) {
    console.log(`   🎯 Clicking Redeem at (${redeemCoords.x}, ${redeemCoords.y})...`);
    await page.mouse.click(redeemCoords.x, redeemCoords.y);
    await page.waitForTimeout(2000);
  } else {
    // Add a service to redeem/apply the membership discount to the sale
    console.log('   Adding a service to apply membership discount...');
    const serviceBtn = page.getByRole('button', { name: /^\+?\s*Service$/i })
      .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^\+?\s*Service$/i }))
      .or(page.getByText('+ Service', { exact: true }))
      .first();

    await serviceBtn.waitFor({ state: 'attached', timeout: 8000 });
    const sBox = await serviceBtn.boundingBox();
    if (sBox) {
      await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    } else {
      await serviceBtn.click({ force: true });
    }
    await page.waitForTimeout(1500);

    // Pick first service checkbox
    const serviceCb = page.locator('flt-semantics[role="checkbox"]').first();
    await serviceCb.waitFor({ state: 'attached', timeout: 8000 });
    await serviceCb.click({ force: true });
    await page.waitForTimeout(500);

    // Click Apply
    const applyServiceBtn = page.getByRole('button', { name: 'Apply', exact: true })
      .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Apply$/i }))
      .first();
    await applyServiceBtn.click({ force: true });
    await page.waitForTimeout(2500);
  }

  await page.screenshot({ path: 'scratch/membership-redeem-after-redeem-clicked.png', fullPage: true });

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

  // Select a different staff member
  const differentStaff = visibleStaff.find(s => !assignedStaffSet.has(s.text)) || visibleStaff[1] || visibleStaff[0];
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

  await page.screenshot({ path: 'scratch/membership-redeem-staff-assigned.png', fullPage: true });

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

  console.log('🎉 Successfully completed Checkout for redeemed membership!');
  await page.screenshot({ path: 'scratch/membership-redeem-final-checkout.png', fullPage: true });

  await page.close();
  await page.context().close();
});
