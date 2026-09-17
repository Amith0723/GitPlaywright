import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.setTimeout(600000);

test.beforeAll(async () => {
  if (!fs.existsSync('downloads')) {
    fs.mkdirSync('downloads', { recursive: true });
  }
});

test('Staff Commission report - all employees x all date ranges', async ({ page }) => {
  // ---- Login ----
  await page.goto('https://devbiz.zylu.co/');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill('test_automation_owner@zylu.co');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('mt@0Ho6~vn4b');
  await page.locator('//*[@id="loginForm"]/button').click();
  await page.waitForURL('**/#/home', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // ---- Navigate to Staff Commission report ----
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

  // ---- Click "Staff Commission" instead of "Staff Summary" ----
  const staffCommissionButton = page.getByRole('button', {
    name: 'Staff Commission Track commissions earned by staff based on sales, performance, or other incentives.',
    exact: true,
  }).first();
  await staffCommissionButton.waitFor({ state: 'visible', timeout: 15000 });
  await staffCommissionButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Helper: click just below a label (fresh position each call, since layout shifts)
  async function openDropdownByLabel(labelText: string) {
    const label = page.getByText(labelText, { exact: true }).first();
    await label.waitFor({ state: 'visible', timeout: 10000 });
    const box = await label.boundingBox();
    if (!box) throw new Error(`Could not get bounding box for "${labelText}" label`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height + 20);
    await page.waitForTimeout(400);
  }

  // Helper: wait for the results table to finish refreshing after a filter change.
  async function waitForResultsToLoad() {
    await page.waitForLoadState('networkidle').catch(() => {});
    const totalRow = page.getByText('Total', { exact: true }).first();
    await totalRow.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
  }

  const employeeNames = ['Artilla', 'audi by rohan', 'Dhruv Salat', 'DILIP', 'djdjf', 'Dr Harror', 'Dummy employee'];

  const dateOptions = [
    'Today',
    'Yesterday',
    'This Week',
    'This Month',
    'Last Week',
    'Last Month',
    'Last 7 Days',
    'Last 30 Days',
    'Month To Date',
    // 'Custom' intentionally skipped
  ];

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
    await waitForResultsToLoad();

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
      await waitForResultsToLoad();

      await page.screenshot({
        path: `commission-${employeeName.replace(/\s/g, '_')}-${dateLabel.replace(/\s/g, '_')}.png`,
        fullPage: true,
      });
    }
  }

  console.log('--- Completed employee x date-range combinations for Staff Commission ---');

  // ===== Only AFTER every dropdown combination has been clicked: =====
  // ===== click "Detailed View" checkbox, wait, then click the download button =====

  // ---- Click "Detailed View" checkbox ----
  // Note: this checkbox has no accessible name (just role="checkbox" + aria-checked),
  // so getByRole with a name filter won't match it. Use the plain role locator instead.
  const detailedViewCheckbox = page.locator('flt-semantics[role="checkbox"]').first();
  const checkboxVisible = await detailedViewCheckbox.isVisible().catch(() => false);

  if (checkboxVisible) {
    const isChecked = await detailedViewCheckbox.isChecked().catch(() => false);
    if (!isChecked) {
      await detailedViewCheckbox.click();
      console.log('Checked "Detailed View"');
    } else {
      console.log('"Detailed View" already checked');
    }
    await page.waitForTimeout(3000); // wait a few seconds for the detailed table to render
    await waitForResultsToLoad();

    await page.screenshot({ path: 'commission-detailed-view.png', fullPage: true });
  } else {
    console.log('"Detailed View" checkbox not visible — skipping');
  }

  // ---- Click the download button (bottom-right, icon-only, no accessible name) to open the menu ----
  const downloadButton = page.locator('flt-semantics.flt-tappable[role="button"]').last();
  const downloadCount = await downloadButton.count();

  if (downloadCount > 0) {
    await downloadButton.click();
    console.log('Clicked download button');
  } else {
    console.log('Download button not found via CSS locator — falling back to fixed position click');
    const viewport = page.viewportSize();
    if (viewport) {
      await page.mouse.click(viewport.width - 47, viewport.height - 47);
    }
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'commission-download-menu-open.png', fullPage: true });

  // ---- Click "Download as PDF" and capture the file ----
  const downloadPdfButton = page.getByText('Download as PDF', { exact: true });
  const pdfVisible = await downloadPdfButton.isVisible().catch(() => false);

  let pdfDownloadPath: string | null = null;

  if (pdfVisible) {
    console.log('Clicking "Download as PDF"');
    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      downloadPdfButton.click(),
    ]);
    pdfDownloadPath = `downloads/staff-commission-${Date.now()}.pdf`;
    await pdfDownload.saveAs(pdfDownloadPath);
    console.log(`PDF - suggested filename: ${pdfDownload.suggestedFilename()}`);
    console.log(`PDF - saved to: ${pdfDownloadPath}`);
    await page.waitForTimeout(1500);
  } else {
    console.log('"Download as PDF" not visible — skipping');
  }

  // ---- Re-open the download menu for the CSV option, since clicking PDF likely closed it ----
  await page.waitForTimeout(1000);
  const downloadButtonAgain = page.locator('flt-semantics.flt-tappable[role="button"]').last();
  const downloadCountAgain = await downloadButtonAgain.count();
  if (downloadCountAgain > 0) {
    await downloadButtonAgain.click();
    await page.waitForTimeout(1500);
  }

  // ---- Click "Download as CSV" and capture the file ----
  const downloadCsvButton = page.getByText('Download as CSV', { exact: true });
  const csvVisible = await downloadCsvButton.isVisible().catch(() => false);

  let csvDownloadPath: string | null = null;

  if (csvVisible) {
    console.log('Clicking "Download as CSV"');
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      downloadCsvButton.click(),
    ]);
    csvDownloadPath = `downloads/staff-commission-${Date.now()}.csv`;
    await csvDownload.saveAs(csvDownloadPath);
    console.log(`CSV - suggested filename: ${csvDownload.suggestedFilename()}`);
    console.log(`CSV - saved to: ${csvDownloadPath}`);
    await page.waitForTimeout(1500);
  } else {
    console.log('"Download as CSV" not visible — skipping');
  }

  await page.screenshot({ path: 'commission-after-both-downloads.png', fullPage: true });

  // ===== Validate both files downloaded successfully =====
  const pdfExists = pdfDownloadPath ? fs.existsSync(pdfDownloadPath) : false;
  const csvExists = csvDownloadPath ? fs.existsSync(csvDownloadPath) : false;

  console.log(`PDF download exists: ${pdfExists}`);
  console.log(`CSV download exists: ${csvExists}`);

  expect(pdfExists, 'Download as PDF should produce a saved file').toBeTruthy();
  expect(csvExists, 'Download as CSV should produce a saved file').toBeTruthy();

  if (pdfExists && csvExists) {
    console.log('✅ Both files (PDF and CSV) downloaded successfully');
  } else {
    console.log('❌ One or both downloads failed');
  }
});