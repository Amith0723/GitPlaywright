export class TestDataGenerator {
  static randomCustomerName(): string {
    return 'AutoCustomer_' + Math.random().toString(36).substring(2, 8);
  }
  static randomPhoneNumber(): string {
    return '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
  }
  static randomEmail(): string {
    return 'qa_test_' + Date.now() + '@zylu.co';
  }
  static randomProductName(): string {
    return 'AutoProduct_' + Math.random().toString(36).substring(2, 7);
  }
}
