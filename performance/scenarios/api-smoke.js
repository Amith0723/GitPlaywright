import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% of requests must complete below 800ms
    http_req_failed: ['rate<0.01'],   // Error rate below 1%
  },
};

const BASE_URL = __ENV.API_URL || 'https://devbiz.zylu.co';

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status is valid': (r) => r.status < 500,
    'response time < 800ms': (r) => r.timings.duration < 800,
  });

  sleep(1);
}
