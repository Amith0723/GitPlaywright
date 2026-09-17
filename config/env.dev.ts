import { BaseConfig } from './env.base';

export const DevConfig = {
  ...BaseConfig,
  env: 'dev',
  webUrl: process.env.DEV_WEB_URL || 'https://devbiz.zylu.co/',
  apiUrl: process.env.DEV_API_URL || 'https://api.devbiz.zylu.co/v1',
  credentials: {
    owner: {
      email: process.env.TEST_USER_EMAIL || 'test_automation_owner@zylu.co',
      password: process.env.TEST_USER_PASSWORD || 'mt@0Ho6~vn4b',
    },
  },
};
