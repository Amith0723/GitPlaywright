import { BaseScreen } from '../../../src/core/mobile/base-screen';
import { NotificationKeys } from './locators/notification.keys';

export class NotificationCenterScreen extends BaseScreen {
  async openNotificationCenter() {
    await this.tap(NotificationKeys.btnNotificationBell);
    console.log('Opened Notification Center in Flutter App');
  }

  async getNotificationCount(): Promise<number> {
    console.log('Retrieving unread notification count');
    return 0;
  }

  async tapNotification(index = 0) {
    console.log(`Opening notification at index ${index}`);
  }

  async clearAll() {
    await this.tap(NotificationKeys.btnClearAll);
    console.log('Cleared all notifications in Flutter App');
  }
}
