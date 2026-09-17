import { BaseApiClient } from '../../../src/core/api/base-api-client';

export class NotificationsClient extends BaseApiClient {
  async sendPushNotification(payload: { userId: string; title: string; body: string; data?: Record<string, any> }) {
    return await this.post('/notifications/push', payload);
  }

  async sendSms(payload: { phone: string; message: string }) {
    return await this.post('/notifications/sms', payload);
  }

  async getNotificationHistory(userId: string) {
    return await this.get(`/notifications/users/${userId}/history`);
  }

  async markAsRead(notificationId: string) {
    return await this.patch(`/notifications/${notificationId}/read`, {});
  }
}
