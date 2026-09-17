export class DateHelper {
  static getTodayFormatted(): string {
    return new Date().toISOString().split('T')[0];
  }
  static getTimestamp(): number {
    return Date.now();
  }
}
