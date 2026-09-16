const { test, expect } = require('@playwright/test');

test.setTimeout(120000);

const clickXPath = async (page, xpath, description) => {
    const locator = page.locator(`xpath=${xpath}`);
    await expect(locator).toBeVisible({ timeout: 30000 });
    const label = await locator.getAttribute('aria-label');
    console.log(`Clicking ${description}:`, label || 'no aria-label');
    await locator.click();
    await page.waitForTimeout(1000);
};

test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
        const screenshotPath = `test-results/failure-${testInfo.title.replace(/\s+/g, '_')}-${Date.now()}.png`;
        await page.screenshot({ path: 'C:\\Users\\Admin\\Pictures\\Camera Roll\\AC.png', fullPage: true });
        console.log('Screenshot saved on failure:', 'C:\\Users\\Admin\\Pictures\\Camera Roll\\AC.png');
    }
    await page.close();
});

test('Add Customer', async ({ page }) => {

    // Open application
    await page.goto('https://devbiz.zylu.co/');

    // Login
    await page.getByRole('textbox', { name: 'Email Address' })
        .fill(process.env.TEST_EMAIL || 'test_automation_owner@zylu.co');

    await page.getByRole('textbox', { name: 'Password' })
        .fill(process.env.TEST_PASSWORD || 'mt@0Ho6~vn4b');

    await page.getByRole('button', { name: 'Sign In' })
        .click();

    // Wait for the app shell to finish loading post-login
    await page.waitForLoadState('domcontentloaded');

    // Click element 1 (e.g. Marketing)
    const element1 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics/flt-semantics[2]/flt-semantics[8]');
    await element1.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element1:', await element1.getAttribute('aria-label'));
    await element1.click();
    await page.waitForTimeout(1000);

    // Click element 2 (e.g. Customers)
    const element2 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics[3]/flt-semantics[23]');
    await element2.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element2:', await element2.getAttribute('aria-label'));
    await element2.click();
    await page.waitForTimeout(1000);

    // Click element 3
    const element3 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics[4]');
    await element3.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element3:', await element3.getAttribute('aria-label'));
    await element3.click();
    await page.waitForTimeout(1000);

    // Click element 4
    const element4 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics[4]');
    await element4.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element4:', await element4.getAttribute('aria-label'));
    await element4.click();
    await page.waitForTimeout(1000);

    // Click element 5
    const element5 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics/flt-semantics[2]');
    await element5.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element5:', await element5.getAttribute('aria-label'));
    await element5.click();
    await page.waitForTimeout(1000);

    // Click element 6
    const element6 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics[5]');
    await element6.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element6:', await element6.getAttribute('aria-label'));
    await element6.click();
    await page.waitForTimeout(1000);

    // Click element 7
    const element7 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics/flt-semantics[3]');
    await element7.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element7:', await element7.getAttribute('aria-label'));
    await element7.click();
    await page.waitForTimeout(1000);

    //click element 8
    const element8 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics[6]');
    await element8.waitFor({ state: 'visible', timeout: 15000 });   
    console.log('About to click element8:', await element8.getAttribute('aria-label'));
    await element8.click();
    await page.waitForTimeout(1000);

    // Click element 9
    const element9 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics/flt-semantics[2]');
    await element9.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element9:', await element9.getAttribute('aria-label'));
    await element9.click();
    await page.waitForTimeout(1000);

    // Click element 10
    const element10 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics[7]');
    await element10.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element10:', await element10.getAttribute('aria-label'));
    await element10.click();
    await page.waitForTimeout(1000);

    //click element 11
    const element11 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics/flt-semantics[2]');
    await element11.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element11:', await element11.getAttribute('aria-label'));
    await element11.click();
    await page.waitForTimeout(1000);

    //eliment 12(apply button)
    const element12 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics[1]/flt-semantics/flt-semantics/flt-semantics[9]');
    await element12.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element12:', await element12.getAttribute('aria-label'));
    await element12.click();
    await page.waitForTimeout(1000);

    // element 13cus    
    const element13 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics[8]/flt-semantics/flt-semantics[1]');
    await element13.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element13:', await element13.getAttribute('aria-label'));
    await element13.click();
    await page.waitForTimeout(1000);

    //element 14 (edit icon)
    const element14 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics[2]/flt-semantics/flt-semantics[5]');
    await element14.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element14:', await element14.getAttribute('aria-label'));
    await element14.click();
    await page.waitForTimeout(1000);

    //element 15 (radio button)
    const element15 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics[2]/flt-semantics/flt-semantics/flt-semantics/flt-semantics[16]');
    await element15.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element15:', await element15.getAttribute('aria-label'));
    await element15.click();
    await page.waitForTimeout(1000);    

    // element updatecust button 16
    const element16 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics[3]');
    await element16.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element16:', await element16.getAttribute('aria-label'));
    await element16.click();
    await page.waitForTimeout(1000);

    //element 17 (packages)
    const element17 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics[2]/flt-semantics/flt-semantics[32]/flt-semantics/flt-semantics[2]/flt-semantics');
    await element17.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element17:', await element17.getAttribute('aria-label'));
    await element17.click();
    await page.waitForTimeout(1000);

    //element 18 (membership)
    const element18 = page.locator('xpath=/html/body/flutter-view/flt-semantics-host/flt-semantics/flt-semantics/flt-semantics/flt-semantics/flt-semantics[2]/flt-semantics/flt-semantics[32]/flt-semantics/flt-semantics[3]/flt-semantics');
    await element18.waitFor({ state: 'visible', timeout: 15000 });
    console.log('About to click element18:', await element18.getAttribute('aria-label'));
    await element18.click();
    await page.waitForTimeout(1000);

    //element 19 (back)
    await page.close();

});