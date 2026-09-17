import { BaseScreen } from '../../../src/core/mobile/base-screen';
import { AuthKeys } from './locators/auth.keys';

export class LoginScreen extends BaseScreen {
  async login(email: string, pass: string) {
    await this.waitForScreenLoaded(AuthKeys.btnLogin);
    console.log('Logging in mobile user: ' + email);
  }
}
