export abstract class BaseScreen {
  async waitForScreenLoaded(selector: string, timeout = 20000): Promise<void> {
    console.log(`Waiting for mobile screen element: ${selector} (timeout: ${timeout}ms)`);
  }

  async tap(selector: string): Promise<void> {
    console.log(`Tapping mobile element: ${selector}`);
  }

  async fill(selector: string, text: string): Promise<void> {
    console.log(`Entering text into ${selector}: ${text}`);
  }

  async getText(selector: string): Promise<string> {
    console.log(`Getting text from mobile element: ${selector}`);
    return '';
  }
}
