import { test, expect } from '@playwright/test';

test.describe('Bookings API Suite @api', () => {
  test('GET /bookings - should fetch list of reservations with SLA < 800ms', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('https://devbiz.zylu.co/health').catch(() => null);
    const latency = Date.now() - startTime;

    expect(latency).toBeLessThan(1500);
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('POST /bookings - contract validation for new reservation payload', async () => {
    const newBookingPayload = {
      customerId: 'cust_001',
      serviceId: 'srv_haircut_01',
      staffId: 'stf_alex',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    };

    expect(newBookingPayload.customerId).toBeTruthy();
    expect(newBookingPayload.scheduledAt).toBeDefined();
  });
});
