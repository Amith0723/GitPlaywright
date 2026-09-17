import { BaseScreen } from '../../../src/core/mobile/base-screen';
import { CatalogKeys } from './locators/catalog.keys';

export class CatalogScreen extends BaseScreen {
  async searchProduct(name: string) {
    await this.waitForScreenLoaded(CatalogKeys.inputSearchCatalog);
    console.log(`Searching catalog for product: ${name}`);
  }

  async selectItem(index = 0) {
    console.log(`Selecting catalog item at index: ${index}`);
  }

  async addItemToCart() {
    await this.tap(CatalogKeys.btnAddToCart);
    console.log('Item added to cart in Flutter App');
  }
}
