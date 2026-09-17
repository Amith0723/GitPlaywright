import { BaseConfig } from './env.base';

export const StagingConfig = {
  ...BaseConfig,
  env: 'staging',
  webUrl: process.env.STAGING_WEB_URL || 'https://stagingbiz.zylu.co/',
  apiUrl: process.env.STAGING_API_URL || 'https://api.stagingbiz.zylu.co/v1',
  credentials: {
    owner: {
      email: process.env.TEST_USER_EMAIL || 'staging_owner@zylu.co',
      password: process.env.TEST_USER_PASSWORD || 'mt@0Ho6~vn4b',
    },
  },
};
