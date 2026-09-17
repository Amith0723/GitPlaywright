import http from 'k6/http';
import { check, sleep } from 'k6';
import { getAuthToken } from '../helpers/k6-auth.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 users
    { duration: '1m', target: 50 },   // Spike to 50 concurrent booking users
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of burst requests within 1.5s
    http_req_failed: ['rate<0.05'],    // Under 5% failures during peak rush
  },
};

const BASE_URL = __ENV.API_URL || 'https://devbiz.zylu.co';

export default function () {
  const token = getAuthToken(BASE_URL);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  // Simulating booking slots query
  const res = http.get(`${BASE_URL}/api/v1/bookings/slots?date=2026-10-01`, params);

  check(res, {
    'slot check completed': (r) => r.status < 500,
  });

  sleep(0.5);
}
