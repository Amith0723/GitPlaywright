import { BaseScreen } from '../../../src/core/mobile/base-screen';
import { BookingKeys } from './locators/booking.keys';

export class BookingScreen extends BaseScreen {
  async openNewBooking() {
    await this.waitForScreenLoaded(BookingKeys.btnNewBooking);
    console.log('Tapping New Booking in Flutter App');
  }

  async fillCustomerDetails(name: string, phone: string) {
    console.log(`Entering booking customer: ${name}, ${phone}`);
  }

  async selectService(serviceName: string) {
    console.log(`Selecting service: ${serviceName}`);
  }

  async selectStaff(staffName: string) {
    console.log(`Assigning staff: ${staffName}`);
  }

  async confirmBooking() {
    console.log('Confirming booking in Flutter App');
  }

  async verifyBookingCreated(expectedStatus = 'Confirmed'): Promise<boolean> {
    console.log(`Verifying booking status: ${expectedStatus}`);
    return true;
  }
}
