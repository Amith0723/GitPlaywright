import { BaseApiClient } from '../../../src/core/api/base-api-client';

export class BookingsClient extends BaseApiClient {
  async getBookings() {
    return await this.get('/bookings');
  }
  async createBooking(data: any) {
    return await this.post('/bookings', data);
  }
  async cancelBooking(id: string) {
    return await this.delete('/bookings/' + id);
  }
}
