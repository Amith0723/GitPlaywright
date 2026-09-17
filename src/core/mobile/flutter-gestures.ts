export class FlutterGestures {
  static async scrollUntilVisible(finderKey: string, scrollDirection = 'down'): Promise<void> {
    console.log('Scrolling ' + scrollDirection + ' until ' + finderKey + ' is visible');
  }
}
