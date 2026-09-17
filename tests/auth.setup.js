const { test: setup } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('🔑 Performing one-time authentication setup...');
  await page.goto('https://devbiz.zylu.co/');
  await page.waitForLoadState('domcontentloaded');

  const emailTab = page.locator('button').filter({ hasText: /^Email & Password$/i }).first();
  if (await emailTab.isVisible().catch(() => false)) {
    await emailTab.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  const emailInput = page.locator('#email').or(page.getByRole('textbox', { name: 'Email Address' })).first();
  await emailInput.fill('test_automation_owner@zylu.co');

  const passwordInput = page.locator('#password').or(page.getByRole('textbox', { name: 'Password' })).first();
  await passwordInput.fill('mt@0Ho6~vn4b');

  const submitButton = page.locator('#loginForm button[type="submit"]')
    .or(page.locator('//*[@id="loginForm"]/button'))
    .or(page.getByRole('button', { name: 'Sign In' }))
    .first();
  await submitButton.click();

  // Handle possible transient login error (e.g. "Failed to fetch") with automatic retry
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.waitForURL('**/#/home', { timeout: 15000 });
      console.log('✅ Logged in successfully in setup');
      break;
    } catch {
      const loginFailed = page.locator('text=Login Failed, text=Failed to fetch').first();
      if (await loginFailed.isVisible().catch(() => false)) {
        console.log('⚠️ Transient "Login Failed" encountered in setup, retrying submit...');
        await page.waitForTimeout(2000);
        await submitButton.click().catch(() => {});
      }
    }
  }

  await page.waitForURL('**/#/home', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Save auth state
  await page.context().storageState({ path: authFile });
  console.log(`💾 Auth state successfully saved to ${authFile}`);
});