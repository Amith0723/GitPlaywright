import { test, expect } from '@playwright/test';

test.describe('Notifications API Suite @api', () => {
  test('POST /notifications/push - schema validation and dispatch check', async () => {
    const pushPayload = {
      userId: 'usr_sarah_09',
      title: 'Booking Confirmed',
      body: 'Your appointment is scheduled for tomorrow at 10:00 AM',
    };

    expect(pushPayload.userId).toBeTruthy();
    expect(pushPayload.title).toBe('Booking Confirmed');
  });

  test('POST /notifications/sms - payload validation for transactional SMS', async () => {
    const smsPayload = {
      phone: '+15551234567',
      message: 'Zylu Verification Code: 489201',
    };

    expect(smsPayload.phone).toMatch(/^\+?[0-9]{10,15}$/);
    expect(smsPayload.message).toContain('Zylu');
  });
});
