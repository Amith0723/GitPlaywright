import { BaseApiClient } from '../../../src/core/api/base-api-client';

export class InventoryClient extends BaseApiClient {
  async getItems() {
    return await this.get('/inventory/items');
  }

  async getItemById(id: string) {
    return await this.get(`/inventory/items/${id}`);
  }

  async updateStock(id: string, quantity: number) {
    return await this.put(`/inventory/items/${id}/stock`, { quantity });
  }

  async addService(serviceData: { name: string; price: number; durationMinutes: number }) {
    return await this.post('/inventory/services', serviceData);
  }
}
