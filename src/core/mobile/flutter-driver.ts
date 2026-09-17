export class FlutterDriverSession {
  static async initSession(): Promise<void> {
    console.log('Initializing Flutter Driver Appium Session...');
  }
  static async stopSession(): Promise<void> {
    console.log('Terminating Flutter Driver Appium Session...');
  }
}
