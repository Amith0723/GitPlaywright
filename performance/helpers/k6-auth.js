import http from 'k6/http';
import { check } from 'k6';

export function getAuthToken(baseUrl, email, password) {
  const payload = JSON.stringify({
    email: email || __ENV.TEST_USER_EMAIL || 'test_automation_owner@zylu.co',
    password: password || __ENV.TEST_USER_PASSWORD || 'Password@123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${baseUrl}/api/v1/auth/login`, payload, params);

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    return body.token || body.accessToken || 'mock_token_12345';
  }

  // Fallback to simulated bearer token for load tests against mock/dev gateways
  return 'bearer_perf_test_token';
}
