const { test: setup, expect } = require('@playwright/test');

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 1. Go to your Zylu app
  await page.goto('https://your-zylu-app-url.com');

  // 2. Fill in login form using your semantics labels
  await page.getByRole('textbox', { name: 'username_field' }).fill('your_username');
  await page.getByRole('textbox', { name: 'password_field' }).fill('your_password');

  // 3. Click login
  await page.getByRole('button', { name: 'login_button' }).click();

  // 4. Wait for something that only appears after successful login
  await expect(page.getByRole('button', { name: 'new_sale_button' })).toBeVisible();

  // 5. Save the logged-in browser state (cookies, localStorage, etc.)
  await page.context().storageState({ path: authFile });
});