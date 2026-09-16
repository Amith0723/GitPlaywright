import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.setTimeout(300000);

test.beforeAll(async () => {
  if (!fs.existsSync('downloads')) {
    fs.mkdirSync('downloads', { recursive: true });
  }
});

test('test', async ({ page }) => {
  // ---- Login ----
  await page.goto('https://devbiz.zylu.co/');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill('test_automation_owner@zylu.co');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('mt@0Ho6~vn4b');
  await page.locator('//*[@id="loginForm"]/button').click();
  await page.waitForURL('**/#/home', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // ---- Navigate to Staff Summary report ----
  const reportsButton = page.getByRole('button', { name: 'Reports', exact: true });
  await reportsButton.waitFor({ state: 'visible', timeout: 15000 });
  await reportsButton.click();
  await page.waitForLoadState('networkidle');

  const inventoryButton = page.getByRole('button', { name: 'Inventory', exact: true }).first();
  await inventoryButton.waitFor({ state: 'visible', timeout: 15000 });
  await inventoryButton.click();
  await page.waitForLoadState('networkidle');

  const taxButton = page.getByRole('button', { name: 'Tax', exact: true }).first();
  await taxButton.waitFor({ state: 'visible', timeout: 15000 });
  await taxButton.click();
  await page.waitForLoadState('networkidle');

  const financialOverviewButton = page.getByRole('button', { name: 'Financial Overview', exact: true }).first();
  await financialOverviewButton.waitFor({ state: 'visible', timeout: 15000 });
  await financialOverviewButton.click();
  await page.waitForLoadState('networkidle');

  const salesPerformanceButton = page.getByRole('button', { name: 'Sales Performance', exact: true }).first();
  await salesPerformanceButton.waitFor({ state: 'visible', timeout: 15000 });
  await salesPerformanceButton.click();
  await page.waitForLoadState('networkidle');

  const staffPerformanceButton = page.getByRole('button', { name: 'Staff Performance', exact: true }).first();
  await staffPerformanceButton.waitFor({ state: 'visible', timeout: 15000 });
  await staffPerformanceButton.click();
  await page.waitForLoadState('networkidle');

  const staffSummaryButton = page.getByRole('button', { name: 'Staff Summary Overview of employee sales from services, products, memberships, and total bookings.', exact: true }).first();
  await staffSummaryButton.waitFor({ state: 'visible', timeout: 15000 });
  await staffSummaryButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);

  // Helper: click just below a label (fresh position each call, since layout shifts)
  async function openDropdownByLabel(labelText) {
    const label = page.getByText(labelText, { exact: true }).first();
    await label.waitFor({ state: 'visible', timeout: 10000 });
    const box = await label.boundingBox();
    if (!box) throw new Error(`Could not get bounding box for "${labelText}" label`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height + 20);
    await page.waitForTimeout(800);
  }

  const employeeNames = ['Artilla', 'audi by rohan', 'Dhruv Salat', 'DILIP', 'djdjf', 'Dr Harror', 'Dummy employee'];
  const dateOptions = ['Today', 'Yesterday', 'This Week', 'This Month'];

  for (const employeeName of employeeNames) {
    console.log(`=== Employee: "${employeeName}" ===`);

    await openDropdownByLabel('Employees');
    const employeeOption = page.getByText(employeeName, { exact: true }).first();
    const employeeVisible = await employeeOption.isVisible().catch(() => false);

    if (!employeeVisible) {
      console.log(`  Employee "${employeeName}" not visible — skipping this employee entirely`);
      continue;
    }

    await employeeOption.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    for (const dateLabel of dateOptions) {
      console.log(`  --- Date range "${dateLabel}" for "${employeeName}" ---`);
      await openDropdownByLabel('Date Range');

      const dateOption = page.getByText(dateLabel, { exact: true }).first();
      const dateVisible = await dateOption.isVisible().catch(() => false);

      if (!dateVisible) {
        console.log(`    "${dateLabel}" not visible — skipping`);
        continue;
      }

      await dateOption.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `report-${employeeName.replace(/\s/g, '_')}-${dateLabel.replace(/\s/g, '_')}.png`,
        fullPage: true,
      });
    }
  }

  console.log('--- Completed employee x date-range combinations ---');

  // ===== Click the download icon (bottom-right, icon-only, no accessible name) =====
  await page.waitForTimeout(1000);

  const downloadButton = page.locator('flt-semantics.flt-tappable[role="button"]').last();
  const downloadCount = await downloadButton.count();
  console.log(`Found ${downloadCount} candidate tappable buttons matching download icon pattern`);

  if (downloadCount > 0) {
    const box = await downloadButton.boundingBox();
    console.log('Download candidate boundingBox:', box);
    await downloadButton.click();
  } else {
    console.log('CSS-based lookup failed — falling back to fixed position click');
    const viewport = page.viewportSize();
    if (viewport) {
      await page.mouse.click(viewport.width - 47, viewport.height - 47);
    }
  }

  await page.waitForTimeout(1500);
  console.log('--- Download icon clicked, menu should be open ---');
  await page.screenshot({ path: 'download-menu-open.png', fullPage: true });

  // ===== Click "Download as CSV" and capture the download =====
  const downloadCsvButton = page.getByText('Download as CSV', { exact: true });
  const csvVisible = await downloadCsvButton.isVisible().catch(() => false);

  let download1Path = null;

  if (csvVisible) {
    console.log('Clicking "Download as CSV"');
    const [download1] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      downloadCsvButton.click(),
    ]);
    download1Path = `downloads/download1-${Date.now()}.csv`;
    await download1.saveAs(download1Path);
    console.log(`Download 1 - suggested filename: ${download1.suggestedFilename()}`);
    console.log(`Download 1 - saved to: ${download1Path}`);
    await page.waitForTimeout(1500);
  } else {
    console.log('"Download as CSV" not visible — skipping');
  }

  await page.screenshot({ path: 'after-download-csv-click.png', fullPage: true });

  // ===== Click the other icon-only button above "Download as CSV" and capture the download =====
  let download2Path = null;

  if (csvVisible) {
    const csvBox = await downloadCsvButton.boundingBox();
    if (csvBox) {
      const [download2] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        page.mouse.click(csvBox.x + 20, csvBox.y - 25),
      ]);
      download2Path = `downloads/download2-${Date.now()}.csv`;
      await download2.saveAs(download2Path);
      console.log(`Download 2 - suggested filename: ${download2.suggestedFilename()}`);
      console.log(`Download 2 - saved to: ${download2Path}`);
      await page.waitForTimeout(1000);
    }
  }

  await page.screenshot({ path: 'after-second-icon-click.png', fullPage: true });

  // ===== Validate both files downloaded successfully =====
  const download1Exists = download1Path ? fs.existsSync(download1Path) : false;
  const download2Exists = download2Path ? fs.existsSync(download2Path) : false;

  console.log(`Download 1 exists: ${download1Exists}`);
  console.log(`Download 2 exists: ${download2Exists}`);

  expect(download1Exists, 'First download (Download as CSV) should exist').toBeTruthy();
  expect(download2Exists, 'Second download should exist').toBeTruthy();

  if (download1Exists && download2Exists) {
    console.log('✅ Both files downloaded successfully');
  } else {
    console.log('❌ One or both downloads failed');
  }

  // ===== Close the browser =====
  await page.close();
  await page.context().close();
  await page.context().browser()?.close();
});