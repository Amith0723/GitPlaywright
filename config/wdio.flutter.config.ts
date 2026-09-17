export const config = {
  runner: 'local',
  port: 4723,
  specs: ['../modules/**/*.flutter.spec.ts'],
  maxInstances: 1,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'Flutter',
      'appium:deviceName': process.env.ANDROID_EMULATOR_NAME || 'Pixel_7_API_34',
      'appium:app': process.env.ANDROID_APP_PATH || './apps/app-debug.apk',
      'appium:newCommandTimeout': 240,
    },
  ],
  logLevel: 'info',
  framework: 'mocha',
  reporters: ['spec'],
};
