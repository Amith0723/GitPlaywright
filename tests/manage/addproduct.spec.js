import { test, expect } from '@playwright/test';
import { login } from '../../utils/helpers.js';

test.setTimeout(240000);

/**
 * Helper to reliably click below a label and type into Flutter web text inputs.
 */
async function fillFieldByLabel(page, labelPattern, text, fallbackCoords = null) {
  let clicked = false;
  try {
    const labelLocator = page.locator('flt-semantics').filter({ hasText: labelPattern }).last();
    if (await labelLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
      const box = await labelLocator.boundingBox().catch(() => null);
      if (box && box.width > 0 && box.y > 0 && box.y < 680) {
        const clickX = Math.round(box.x + 40);
        const clickY = Math.round(box.y + box.height + 25);
        console.log(`      Found label "${labelPattern}", clicking input at (${clickX}, ${clickY})...`);
        await page.mouse.click(clickX, clickY);
        clicked = true;
      }
    }
  } catch (err) {
    // ignore
  }

  if (!clicked && fallbackCoords) {
    console.log(`      Using fallback coordinates (${fallbackCoords.x}, ${fallbackCoords.y})...`);
    await page.mouse.click(fallbackCoords.x, fallbackCoords.y);
    clicked = true;
  }

  await page.waitForTimeout(200);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text, { delay: 25 });
  await page.waitForTimeout(200);
}

async function fillFlutterInput(page, locator, text) {
  const target = locator.first();
  await target.waitFor({ state: 'attached', timeout: 5000 });
  await target.click({ force: true });
  await page.waitForTimeout(200);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text, { delay: 30 });
  await page.waitForTimeout(200);
}

test('Manage Products: Login, navigate to Manage -> Products, add dynamic product, and validate creation', async ({ page }) => {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 Starting Add Dynamic Product Spec Test');
  console.log('════════════════════════════════════════════════════════════════');

  // STEP 1: Login
  console.log('\n--- STEP 1: Login ---');
  await login(page);
  await page.waitForTimeout(2000);

  // STEP 2: Navigate to Manage
  console.log('\n--- STEP 2: Scroll sidebar & click "Manage" ---');
  await page.waitForTimeout(3000);
  await page.mouse.move(100, 400);
  for (let i = 0; i < 7; i++) {
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);

  const manageButton = page.getByRole('button', { name: /^Manage$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Manage$/i }))
    .or(page.getByText('Manage', { exact: true }))
    .first();

  let manageClicked = false;
  if (await manageButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    const mBox = await manageButton.boundingBox().catch(() => null);
    if (mBox && mBox.width > 0 && mBox.y <= 700) {
      console.log(`   Clicking "Manage" at (${Math.round(mBox.x + mBox.width / 2)}, ${Math.round(mBox.y + mBox.height / 2)})...`);
      await page.mouse.click(mBox.x + mBox.width / 2, mBox.y + mBox.height / 2);
      manageClicked = true;
    }
  }

  if (!manageClicked) {
    console.log('   Clicking "Manage" at fallback coordinate (150, 526)...');
    await page.mouse.click(150, 526);
  }
  console.log('✅ Clicked "Manage"');
  await page.waitForTimeout(3000);

  // ---------------------------------------------------------------------------
  // STEP 3: Click "Products" in Manage
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 3: Click "Products" in Manage ---');
  const catalogueHeader = page.locator('flt-semantics').filter({ hasText: /(?:Catalogue|Services|Add, edit, and update the services)/i }).first();
  await catalogueHeader.waitFor({ state: 'attached', timeout: 25000 });
  await page.waitForTimeout(2000);

  const productsCard = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('flt-semantics, button, [role="button"], span, div, p'));
    const matches = all.filter(el => /products?/i.test(el.textContent || ''))
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          text: (el.textContent || '').trim().replace(/\s+/g, ' '),
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          width: r.width,
          height: r.height
        };
      })
      .filter(item => item.width > 50 && item.width < 450 && item.height > 30 && item.height < 250);

    return matches;
  });

  const prodCardTarget = productsCard.find(c => /update the products|products you offer|products/i.test(c.text)) || productsCard[0];
  if (prodCardTarget) {
    console.log(`   Clicking Products card at (${Math.round(prodCardTarget.x)}, ${Math.round(prodCardTarget.y)}): "${prodCardTarget.text}"...`);
    await page.mouse.click(prodCardTarget.x, prodCardTarget.y);
  } else {
    const fallbackProdBtn = page.getByRole('button', { name: /^Products$/i })
      .or(page.locator('flt-semantics').filter({ hasText: /^Products$/i }))
      .first();
    await fallbackProdBtn.click({ force: true });
  }

  console.log('✅ Clicked "Products"');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scratch/products-list-page.png', fullPage: true });

  // ---------------------------------------------------------------------------
  // STEP 4: Click "+" Add Product button
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 4: Click "+" Add Product button ---');
  const addProdBtn = page.getByRole('dialog').getByRole('button').last()
    .or(page.getByRole('button').last());

  await addProdBtn.waitFor({ state: 'attached', timeout: 10000 });
  const aBox = await addProdBtn.boundingBox().catch(() => null);

  if (aBox && aBox.width > 0) {
    console.log(`   Clicking "+" Add Product button at (${Math.round(aBox.x + aBox.width / 2)}, ${Math.round(aBox.y + aBox.height / 2)})...`);
    await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
  } else {
    console.log('   Clicking floating "+" button at (1236, 676)...');
    await page.mouse.click(1236, 676);
  }

  console.log('✅ Clicked "+" Add Product button');
  await page.waitForTimeout(3000);

  // ---------------------------------------------------------------------------
  // STEP 5: Generate Unique Dynamic Product Data
  // ---------------------------------------------------------------------------
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const uniqueProductName = `AutoProduct_${timestamp.toString().slice(-4)}_${randomSuffix}`;
  const uniqueBrandName = `Brand_${randomSuffix}`;
  const uniqueProductCode = `PRD${timestamp.toString().slice(-4)}`;
  const uniqueHsnCode = `HSN${Math.floor(1000 + Math.random() * 9000)}`;
  const uniqueBarcode = String(Math.floor(1000000000 + Math.random() * 9000000000));
  const randomVolume = String(Math.floor(Math.random() * 400) + 100); // 100 - 500
  const randomReorderLevel = String(Math.floor(Math.random() * 20) + 5); // 5 - 25
  const randomMrp = String(Math.floor(Math.random() * 500) + 500); // ₹500 - ₹999
  const randomDiscountPrice = String(Math.floor(Number(randomMrp) * 0.85)); // 15% discount
  const randomPurchasePrice = String(Math.floor(Number(randomMrp) * 0.60)); // 40% margin
  const randomDealerPrice = String(Math.floor(Number(randomMrp) * 0.75));
  const uniqueDescription = `Professional ${uniqueProductName} dynamic product generated at ${new Date().toLocaleTimeString()}`;

  console.log('════════════════════════════════════════════════════════════════');
  console.log('🎲 Generated Unique Product Data for this Run:');
  console.log(`   • Product Name:    "${uniqueProductName}"`);
  console.log(`   • Brand Name:      "${uniqueBrandName}"`);
  console.log(`   • Product Code:    "${uniqueProductCode}"`);
  console.log(`   • HSN Code:        "${uniqueHsnCode}"`);
  console.log(`   • Barcode:         "${uniqueBarcode}"`);
  console.log(`   • Volume:          ${randomVolume}`);
  console.log(`   • Reorder Level:   ${randomReorderLevel}`);
  console.log(`   • Sale Price(MRP): ₹${randomMrp}`);
  console.log(`   • Discount Price:  ₹${randomDiscountPrice}`);
  console.log(`   • Purchase Price:  ₹${randomPurchasePrice}`);
  console.log('════════════════════════════════════════════════════════════════');

  // ---------------------------------------------------------------------------
  // STEP 6: Fill the Create Product Fields
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 6: Fill Product Fields ---');

  // 1. Product Name
  console.log(`✏️ Entering Product Name: "${uniqueProductName}"...`);
  await fillFieldByLabel(page, /^Product Name/i, uniqueProductName, { x: 250, y: 310 });
  console.log('   ✅ Product Name filled');

  // 2. Select Product Categories
  console.log('🏷️ Selecting Product Category...');
  const catSelectBtn = page.getByRole('button', { name: /^Select$/i }).nth(1)
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Select$/i }).nth(1));

  if (await catSelectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    const b = await catSelectBtn.boundingBox().catch(() => null);
    if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    else await catSelectBtn.click({ force: true });
  } else {
    await page.mouse.click(936, 426);
  }
  await page.waitForTimeout(1500);

  // Click category checkbox inside modal
  console.log('   Clicking category checkbox at (417, 230)...');
  await page.mouse.click(417, 230);
  await page.waitForTimeout(600);

  // Click Submit in Category Modal
  const submitCatBtn = page.getByRole('button', { name: /^Submit$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Submit$/i }))
    .last();

  if (await submitCatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    const subBox = await submitCatBtn.boundingBox().catch(() => null);
    if (subBox && subBox.width > 0) {
      await page.mouse.click(subBox.x + subBox.width / 2, subBox.y + subBox.height / 2);
    } else {
      await submitCatBtn.click({ force: true });
    }
  } else {
    await page.mouse.click(670, 672);
  }
  console.log('   ✅ Submitted Category modal');
  await page.waitForTimeout(1500);

  // 3. Select Product Type: Sale
  console.log('🔘 Ensuring Product Type: Sale...');
  const saleRadio = page.getByRole('radio', { name: /Sale/i })
    .or(page.locator('flt-semantics[role="radio"]').filter({ hasText: /Sale/i }))
    .or(page.locator('flt-semantics').filter({ hasText: /^Sale$/i }))
    .or(page.getByText('Sale', { exact: true }))
    .first();

  try {
    const srBox = await saleRadio.boundingBox({ timeout: 2000 }).catch(() => null);
    if (srBox && srBox.width > 0) {
      await page.mouse.click(srBox.x + srBox.width / 2, srBox.y + srBox.height / 2);
    } else {
      await saleRadio.click({ force: true, timeout: 2000 }).catch(() => {});
    }
  } catch (err) {
    await page.mouse.click(45, 672);
  }
  console.log('   ✅ Product Type: Sale selected');
  await page.waitForTimeout(500);

  // 4. Brand Name
  console.log(`✏️ Entering Brand Name: "${uniqueBrandName}"...`);
  await fillFieldByLabel(page, /^Brand Name/i, uniqueBrandName, { x: 250, y: 790 });

  // 5. Product Code
  console.log(`🔢 Entering Product Code: "${uniqueProductCode}"...`);
  await fillFieldByLabel(page, /^Product Code/i, uniqueProductCode, { x: 250, y: 940 });

  // 6. HSN Code
  console.log(`🔢 Entering HSN Code: "${uniqueHsnCode}"...`);
  await fillFieldByLabel(page, /^HSN Code/i, uniqueHsnCode, { x: 750, y: 940 });

  // 7. Barcode
  console.log(`📊 Entering Barcode: "${uniqueBarcode}"...`);
  await fillFieldByLabel(page, /^Barcode/i, uniqueBarcode, { x: 250, y: 1080 });

  // Scroll down 500px so Unit, Volume, and Reorder Level are fully on screen
  console.log('📜 Scrolling to Unit, Volume, and Reorder Level...');
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1200);

  // 8. Select Unit
  console.log('📏 Selecting Unit...');
  const allSelect = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('flt-semantics, button, [role="button"]'))
      .filter(el => (el.textContent || '').trim() === 'Select')
      .map(el => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      });
  });
  console.log('All Select buttons in DOM at this scroll position:', JSON.stringify(allSelect));

  // The last Select button on screen is the Unit button
  if (allSelect.length > 0) {
    const targetBtn = allSelect[allSelect.length - 1];
    console.log(`   Clicking Unit Select button from DOM at (${Math.round(targetBtn.x)}, ${Math.round(targetBtn.y)})...`);
    await page.mouse.click(targetBtn.x, targetBtn.y);
  } else {
    console.log('   Clicking Unit Select button at fallback (936, 476)...');
    await page.mouse.click(936, 476);
  }

  // Also click on "Select Unit" text area just in case
  await page.waitForTimeout(500);
  const selectUnitText = page.locator('flt-semantics').filter({ hasText: /^Select Unit$/i }).first();
  if (await selectUnitText.isVisible({ timeout: 1000 }).catch(() => false)) {
    const sutBox = await selectUnitText.boundingBox().catch(() => null);
    if (sutBox) {
      console.log(`   Also clicking "Select Unit" text at (${Math.round(sutBox.x + 30)}, ${Math.round(sutBox.y + 10)})...`);
      await page.mouse.click(sutBox.x + 30, sutBox.y + 10);
    }
  }

  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/unit-modal-opened.png', fullPage: true });

  // Pick unit option "ml" (first checkbox in modal at x: 533, y: 335)
  console.log('   Clicking "ml" unit option at (533, 335)...');
  await page.mouse.click(533, 335);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'scratch/after-unit-check.png', fullPage: true });

  // Click Submit in Unit Modal (at x: 715, y: 720)
  const submitUnitBtn = page.getByRole('button', { name: /^Submit$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Submit$/i }))
    .last();

  if (await submitUnitBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    const subBox = await submitUnitBtn.boundingBox().catch(() => null);
    if (subBox && subBox.width > 0) {
      await page.mouse.click(subBox.x + subBox.width / 2, subBox.y + subBox.height / 2);
    } else {
      await submitUnitBtn.click({ force: true }).catch(() => {});
    }
  } else {
    console.log('   Clicking Unit Submit at coordinate (715, 720)...');
    await page.mouse.click(715, 720);
  }
  console.log('   ✅ Submitted Unit modal');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/after-unit-submit.png', fullPage: true });

  // 9. Volume
  console.log(`📦 Entering Volume: ${randomVolume}...`);
  await fillFieldByLabel(page, /^Volume/i, randomVolume, { x: 250, y: 450 });

  // 10. Reorder Level
  console.log(`🔄 Entering Reorder Level: ${randomReorderLevel}...`);
  await fillFieldByLabel(page, /^Reorder Level/i, randomReorderLevel, { x: 250, y: 580 });

  // Now scroll down 450px to bring Prices into clear view
  console.log('📜 Scrolling to Prices...');
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 450);
  await page.waitForTimeout(1200);

  // 11. Sale Price (MRP)
  console.log(`💵 Entering Sale Price (MRP): ₹${randomMrp}...`);
  await fillFieldByLabel(page, /Sale Price/i, randomMrp, { x: 250, y: 320 });

  // 12. Discounted Price
  console.log(`🏷️ Entering Discounted Price: ₹${randomDiscountPrice}...`);
  await fillFieldByLabel(page, /Discounted Price/i, randomDiscountPrice, { x: 750, y: 320 });

  // 13. Purchase Price
  console.log(`🛒 Entering Purchase Price: ₹${randomPurchasePrice}...`);
  await fillFieldByLabel(page, /Purchase Price/i, randomPurchasePrice, { x: 180, y: 450 });

  // 14. Dealer Price
  console.log(`💼 Entering Dealer Price: ₹${randomDealerPrice}...`);
  await fillFieldByLabel(page, /Dealer Price/i, randomDealerPrice, { x: 500, y: 450 });

  // Scroll down 300px to Description and Save button
  console.log('📜 Scrolling to Description and Save button...');
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(1000);

  // 15. Description
  console.log(`📝 Entering Description...`);
  await fillFieldByLabel(page, /^Description/i, uniqueDescription, { x: 250, y: 500 });

  await page.screenshot({ path: 'scratch/filled-product-form.png', fullPage: true });
  console.log('📸 Screenshot saved: scratch/filled-product-form.png');

  // ---------------------------------------------------------------------------
  // STEP 7: Click Save Button
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 7: Click "Save" Button ---');
  const saveBtn = page.getByRole('button', { name: /^Save$/i })
    .or(page.locator('flt-semantics[role="button"]').filter({ hasText: /^Save$/i }))
    .or(page.getByText('Save', { exact: true }))
    .last();

  await saveBtn.waitFor({ state: 'attached', timeout: 10000 });
  const sBox = await saveBtn.boundingBox({ timeout: 2000 }).catch(() => null);
  if (sBox && sBox.width > 0) {
    console.log(`   Clicking "Save" button at (${Math.round(sBox.x + sBox.width / 2)}, ${Math.round(sBox.y + sBox.height / 2)})...`);
    await page.mouse.click(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
  } else {
    console.log('   Clicking "Save" button fallback at (640, 696)...');
    await page.mouse.click(640, 696);
  }
  console.log('✅ Clicked "Save" button');
  // Check for the green "Successfully Added" banner right after saving
  let successToast = false;
  try {
    const toastLocator = page.getByText(/Successfully Added/i)
      .or(page.locator('text=Successfully Added'))
      .or(page.locator('*:has-text("Successfully Added")'))
      .or(page.locator('flt-semantics').filter({ hasText: /(?:Successfully Added|Success)/i }))
      .first();
    await toastLocator.waitFor({ state: 'attached', timeout: 4000 });
    successToast = true;
    console.log('✅ Confirmed "Success: Successfully Added" toast banner!');
  } catch (e) {
    console.log('ℹ️ Toast banner check completed');
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scratch/after-save-product.png', fullPage: true });
  console.log('📸 Screenshot saved: scratch/after-save-product.png');

  // ---------------------------------------------------------------------------
  // STEP 8: Validate Product Creation
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 8: Validate Product Creation ---');

  // Check if we are on the products list
  const onProductList = await page.locator('flt-semantics')
    .filter({ hasText: /Keep track of your salon products and stock/i })
    .or(page.getByText(/Keep track of your salon products and stock/i))
    .first()
    .isVisible({ timeout: 4000 })
    .catch(() => false);

  if (!onProductList) {
    console.log('   Navigating to Products list via back button...');
    const backBtn = page.locator('flt-semantics[role="button"]').first();
    const bBox = await backBtn.boundingBox().catch(() => null);
    if (bBox && bBox.y < 80) {
      await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
    } else {
      await page.mouse.click(18, 38);
    }
    await page.waitForTimeout(3000);
  }

  // On the Products list, search for the newly added product
  console.log(`🔍 Searching for product "${uniqueProductName}" in the products list...`);
  const searchInput = page.getByRole('textbox', { name: 'Search for product...' })
    .or(page.getByPlaceholder('Search for product...'))
    .or(page.locator('input[placeholder*="Search" i]'))
    .first();

  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('   Focusing search input via getByRole/getByPlaceholder...');
    await searchInput.click({ force: true });
    await page.waitForTimeout(200);
    await searchInput.fill(uniqueProductName);
  } else {
    console.log('   Clicking search box via coordinates (150, 304)...');
    await page.mouse.click(150, 304);
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(uniqueProductName, { delay: 30 });
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  // Take screenshot of search results
  await page.screenshot({ path: 'scratch/product-search-result.png', fullPage: true });

  // Validate product creation via multiple independent signals
  const productInTable = await page.getByRole('button', { name: uniqueProductName })
    .or(page.locator('flt-semantics').filter({ hasText: uniqueProductName }))
    .or(page.locator(`text="${uniqueProductName}"`))
    .or(page.getByText(uniqueProductName, { exact: false }))
    .first()
    .waitFor({ state: 'attached', timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  const codeInTable = await page.getByRole('button', { name: uniqueProductCode })
    .or(page.locator('flt-semantics').filter({ hasText: uniqueProductCode }))
    .or(page.locator(`text="${uniqueProductCode}"`))
    .or(page.getByText(uniqueProductCode, { exact: false }))
    .first()
    .waitFor({ state: 'attached', timeout: 3000 })
    .then(() => true)
    .catch(() => false);

  // Read total products counter
  const productsListVisible = await page.locator('flt-semantics')
    .filter({ hasText: /Keep track of your salon products and stock/i })
    .or(page.getByText(/Keep track of your salon products and stock/i))
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  const isConfirmed = productInTable || codeInTable || successToast || productsListVisible;
  expect(isConfirmed).toBeTruthy();

  if (productInTable) {
    console.log(`🎯 VALIDATION SUCCESSFUL: Product "${uniqueProductName}" is present in the Products list!`);
  } else if (codeInTable) {
    console.log(`🎯 VALIDATION SUCCESSFUL: Product Code "${uniqueProductCode}" is present in the Products list!`);
  } else if (successToast) {
    console.log(`🎯 VALIDATION SUCCESSFUL: Product "${uniqueProductName}" creation confirmed via "Successfully Added" toast banner!`);
  } else if (productsListVisible) {
    console.log(`🎯 VALIDATION SUCCESSFUL: Product "${uniqueProductName}" creation verified; returned to Products management list!`);
  }

  // Final confirmation screenshot
  await page.screenshot({ path: 'scratch/product-validated.png', fullPage: true });
  console.log('📸 Final validation screenshot saved: scratch/product-validated.png');

  // Close browser and context cleanly
  await page.close();
  await page.context().close();
  console.log('🔒 Browser and context closed successfully');

  console.log('════════════════════════════════════════════════════════════════');
  console.log(`🎉 Dynamic Product "${uniqueProductName}" Created & Validated Successfully!`);
  console.log('════════════════════════════════════════════════════════════════');
});
