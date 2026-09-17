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

  // ---- Click "Reports" button ----
  const reportsButton = page.getByRole('button', { name: 'Reports', exact: true });
  await reportsButton.waitFor({ state: 'visible', timeout: 15000 });
  await reportsButton.click();
  await page.waitForLoadState('networkidle');

  // ---- Click "Daily Revenue" report card ----
  const dailyRevenueButton = page.getByRole('button', {
    name: 'Daily Revenue Daily revenue totals, including tips, outstanding balances, and collected payments.',
    exact: true,
  }).first();
  await dailyRevenueButton.waitFor({ state: 'visible', timeout: 15000 });
  await dailyRevenueButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);

  // Helper: click just below a label (fresh position each call, since layout shifts)
  async function openDropdownByLabel(labelText: string) {
    const label = page.getByText(labelText, { exact: true }).first();
    await label.waitFor({ state: 'visible', timeout: 10000 });
    const box = await label.boundingBox();
    if (!box) throw new Error(`Could not get bounding box for "${labelText}" label`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height + 20);
    await page.waitForTimeout(800);
  }

  // Helper: wait for the results table to finish refreshing after a filter change.
  async function waitForResultsToLoad() {
    await page.waitForLoadState('networkidle');
    const totalRow = page.getByText('Total', { exact: true }).first();
    await totalRow.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
      console.log('  "Total" row not found within timeout — continuing anyway');
    });
    await page.waitForTimeout(1500);
  }

  // Helper: build a regex matching a calendar day cell's accessible name by the
  // STABLE part only (day, weekday, month, day, year). Deliberately does NOT
  // anchor on trailing suffixes like ", Today" or ", Selected" — those depend
  // on what today's actual date is when the test runs, not on which day you're
  // trying to click, so hardcoding them makes the locator break the day after
  // you write it.
  function dayCellNamePattern(day: number): RegExp {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), day);
    const weekday = target.toLocaleDateString('en-US', { weekday: 'long' });
    const month = target.toLocaleDateString('en-US', { month: 'long' });
    const year = target.getFullYear();
    return new RegExp(`^${day}, ${weekday}, ${month} ${day}, ${year}`);
  }

  // ---- Loop through every Date Range option (Custom excluded — needs a date picker flow) ----
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

  for (const dateLabel of dateOptions) {
    console.log(`--- Date range "${dateLabel}" ---`);
    await openDropdownByLabel('Date Range');

    const dateOption = page.getByText(dateLabel, { exact: true }).first();
    const dateVisible = await dateOption.isVisible().catch(() => false);

    if (!dateVisible) {
      console.log(`  "${dateLabel}" not visible — skipping`);
      continue;
    }

    await dateOption.click();
    await waitForResultsToLoad();

    await page.screenshot({
      path: `daily-revenue-${dateLabel.replace(/\s/g, '_')}.png`,
      fullPage: true,
    });
  }

  console.log('--- Completed Date Range sweep for Daily Revenue ---');

  // ---- Handle "Custom" date range: select 2 to 13 (current month), click Save, wait for results ----
  console.log('--- Date range "Custom" ---');
  await openDropdownByLabel('Date Range');

  const customOption = page.getByText('Custom', { exact: true }).first();
  const customVisible = await customOption.isVisible().catch(() => false);

  if (customVisible) {
    await customOption.click();
    await page.waitForTimeout(1500);

    // Debug screenshot right after clicking "Custom" — helps confirm whether the
    // calendar dialog actually opened, and what the day cells look like if not.
    await page.screenshot({ path: 'debug-after-custom-click.png', fullPage: true });

    // Wait for the calendar dialog to actually be open using its header text
    // ("Select range") as a reliable signal, rather than assuming it's there.
    const selectRangeHeader = page.getByText('Select range', { exact: false }).first();
    const dialogOpened = await selectRangeHeader.waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (!dialogOpened) {
      console.log('  Calendar dialog ("Select range") did not appear — see debug-after-custom-click.png');
    } else {
      // Calendar dialog is now open — click the start day (2) then the end day (13)
      // of the CURRENT month.
      //
      // BUG THIS FIXES: the previous version hardcoded the full accessible name
      // for each day, e.g. '13, Thursday, August 13, 2026, Today'. The ", Today"
      // suffix only appears on whichever day is ACTUALLY today when the test
      // runs — it matched once, on Aug 13 2026, then broke the very next day
      // once "Today" moved to a different cell and the exact-match string could
      // never match again. Fixed by computing weekday/month/year at runtime and
      // matching only the stable prefix (day, weekday, month, day, year),
      // ignoring any trailing suffix Flutter may or may not append.
      const startDayCell = page.getByRole('button', { name: dayCellNamePattern(2) }).first();
      const startDayVisible = await startDayCell.waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false);

      if (!startDayVisible) {
        console.log('  Start day cell not found — listing all button labels inside the dialog');
        const dialogEl = page.locator('flt-semantics[role="dialog"][aria-modal="true"]').first();
        const buttonTexts = await dialogEl.locator('flt-semantics[role="button"]').allTextContents().catch(() => []);
        console.log(`  Found ${buttonTexts.length} buttons in dialog:`);
        buttonTexts.forEach((t, i) => console.log(`    [${i}] "${t}"`));

        console.log('--- Skipping Custom date range due to locator mismatch — see button list above ---');
      } else {
        await startDayCell.click();
        await page.waitForTimeout(500);

        const endDayCell = page.getByRole('button', { name: dayCellNamePattern(13) }).first();
        await endDayCell.waitFor({ state: 'visible', timeout: 10000 });
        await endDayCell.click();
        await page.waitForTimeout(500);

        // Click "Save" to confirm the selected range
        const saveButton = page.getByRole('button', { name: 'Save', exact: true }).first();
        const saveVisible = await saveButton.isVisible().catch(() => false);
        if (saveVisible) {
          await saveButton.click();
        } else {
          await page.getByText('Save', { exact: true }).first().click();
        }

        await waitForResultsToLoad();

        await page.screenshot({ path: 'daily-revenue-Custom_2_to_13.png', fullPage: true });
        console.log('--- Completed Custom date range (2 to 13) ---');
      }
    }
  } else {
    console.log('  "Custom" option not visible — skipping');
  }

  // ===== Click the download icon (bottom-right, icon-only, no accessible name) =====
  await page.waitForTimeout(1000);

  const downloadButton = page.locator('flt-semantics.flt-tappable[role="button"]').last();
  const downloadCount = await downloadButton.count();
  console.log(`Found ${downloadCount} candidate tappable buttons matching download icon pattern`);

  if (downloadCount > 0) {
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
  await page.screenshot({ path: 'daily-revenue-download-menu-open.png', fullPage: true });

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
    pdfDownloadPath = `downloads/daily-revenue-${Date.now()}.pdf`;
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
    csvDownloadPath = `downloads/daily-revenue-${Date.now()}.csv`;
    await csvDownload.saveAs(csvDownloadPath);
    console.log(`CSV - suggested filename: ${csvDownload.suggestedFilename()}`);
    console.log(`CSV - saved to: ${csvDownloadPath}`);
    await page.waitForTimeout(1500);
  } else {
    console.log('"Download as CSV" not visible — skipping');
  }

  await page.screenshot({ path: 'daily-revenue-after-both-downloads.png', fullPage: true });

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

  // ---- Close the browser ----
  await page.close();
  console.log('🎉 Test completed — browser closed');

});