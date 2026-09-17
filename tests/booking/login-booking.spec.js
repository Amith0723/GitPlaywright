const { test, expect } = require('@playwright/test');

test('Login and New Sale', async ({ page }) => {

    await page.goto('https://devbiz.zylu.co/');

    await page.getByRole('textbox', { name: 'Email Address' })
        .fill('test_automation_owner@zylu.co');

    await page.getByRole('textbox', { name: 'Password' })
        .fill('mt@0Ho6~vn4b');

    await page.getByRole('button', { name: 'Sign In' })
        .click();

    await page.getByRole('button', { name: 'New Sale' })
        .click();

});