import { BaseApiClient } from '../../../src/core/api/base-api-client';

export class AuthClient extends BaseApiClient {
  async login(credentials: { email: string; password: string }) {
    return await this.post('/auth/login', credentials);
  }
  async refreshToken(refreshToken: string) {
    return await this.post('/auth/refresh', { refreshToken });
  }
}
