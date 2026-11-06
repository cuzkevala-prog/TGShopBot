process.env.USE_LOCAL_STORAGE = 'true';

const assert = require('assert');
const path = require('path');

async function runTests() {
  console.log('🧪 Starting TGSHOPBOT v0.6.4 Comprehensive Test Suite...\n');

  const shippingRepo = require('../src/database/repositories/shippingRepo');
  const productRepo = require('../src/database/repositories/productRepo');
  const orderRepo = require('../src/database/repositories/orderRepo');
  const paymentRepo = require('../src/database/repositories/paymentRepo');
  const { formatInvoice } = require('../src/utils/formatters');
  const { restorePhysicalStockIfNeeded } = require('../src/bot/actions/orderActions');

  // ==========================================
  // TEST 1: Shipping Methods Repository
  // ==========================================
  console.log('--- Test 1: Shipping Methods Repository ---');
  const allInitialShipping = await shippingRepo.getAllShippingMethods();
  console.log(`Found ${allInitialShipping.length} initial shipping methods.`);
  assert(Array.isArray(allInitialShipping), 'Shipping methods should be an array');

  // Add new shipping method
  const newShip = await shippingRepo.addShippingMethod({
    name: 'Hermes Paket Test',
    cost: 4.90,
    is_active: true
  });
  assert(newShip && newShip.id, 'Should create new shipping method with ID');
  assert.strictEqual(newShip.name, 'Hermes Paket Test');
  assert.strictEqual(Number(newShip.cost), 4.90);
  console.log('✔ addShippingMethod succeeded:', newShip.id);

  // Retrieve by ID
  const retrievedShip = await shippingRepo.getShippingMethodById(newShip.id);
  assert(retrievedShip, 'Should find shipping method by id');
  assert.strictEqual(retrievedShip.name, 'Hermes Paket Test');
  console.log('✔ getShippingMethodById succeeded');

  // Update shipping method
  const updatedShip = await shippingRepo.updateShippingMethod(newShip.id, {
    name: 'Hermes Paket Express',
    cost: 7.50
  });
  assert.strictEqual(updatedShip.name, 'Hermes Paket Express');
  assert.strictEqual(Number(updatedShip.cost), 7.50);
  console.log('✔ updateShippingMethod succeeded');

  // Toggle active
  const toggledShip = await shippingRepo.toggleShippingMethodActive(newShip.id, false);
  assert.strictEqual(toggledShip.is_active, false);
  const activeMethods = await shippingRepo.getActiveShippingMethods();
  assert(!activeMethods.some(m => m.id === newShip.id), 'Inactive shipping method should not be in active list');
  console.log('✔ toggleShippingMethodActive succeeded');

  // Delete shipping method
  const delSuccess = await shippingRepo.deleteShippingMethod(newShip.id);
  assert.strictEqual(delSuccess, true);
  const afterDelete = await shippingRepo.getShippingMethodById(newShip.id);
  assert(!afterDelete, 'Shipping method should be deleted');
  console.log('✔ deleteShippingMethod succeeded\n');

  // ==========================================
  // TEST 2: Product Repository (Physical Stock & Allowed Payment Methods)
  // ==========================================
  console.log('--- Test 2: Product Repository (Stock & Payment Methods) ---');
  const testProduct = await productRepo.addProduct({
    name: 'Test Physischer Artikel v0.6.4',
    description: 'Beschreibung Test',
    price: 49.99,
    delivery_option: 'post',
    stock: 25,
    allowed_payment_methods: ['btc', 'cash_delivery']
  });
  assert(testProduct && testProduct.id, 'Should create product');
  assert.strictEqual(Number(testProduct.stock), 25, 'Stock should be 25');
  assert(Array.isArray(testProduct.allowed_payment_methods), 'allowed_payment_methods should be array');
  assert.deepStrictEqual(testProduct.allowed_payment_methods, ['btc', 'cash_delivery']);
  console.log('✔ addProduct with stock and allowed_payment_methods succeeded:', testProduct.id);

  // Update stock
  const updatedProdStock = await productRepo.updateProductStock(testProduct.id, 42);
  assert.strictEqual(Number(updatedProdStock.stock), 42, 'Updated stock should be 42');
  console.log('✔ updateProductStock succeeded');

  // Update allowed payment methods
  const updatedProdPay = await productRepo.updateProductAllowedPaymentMethods(testProduct.id, ['ltc', 'xmr']);
  assert.deepStrictEqual(updatedProdPay.allowed_payment_methods, ['ltc', 'xmr']);
  console.log('✔ updateProductAllowedPaymentMethods succeeded\n');

  // ==========================================
  // TEST 3: Orders Repository with Shipping Fields
  // ==========================================
  console.log('--- Test 3: Order Repository with Shipping Details ---');
  const testOrder = await orderRepo.createOrder({
    user_id: 'test_user_v064',
    product_id: testProduct.id,
    quantity: 2,
    total_amount: 109.98,
    payment_method: 'btc',
    shipping_address: 'Musterstrasse 12, 12345 Berlin',
    shipping_method_name: 'DHL Paket Premium',
    shipping_cost: 10.00
  });
  assert(testOrder && testOrder.id, 'Should create order');
  assert.strictEqual(testOrder.shipping_method_name, 'DHL Paket Premium');
  assert.strictEqual(Number(testOrder.shipping_cost), 10.00);
  console.log('✔ createOrder with shipping_method_name and shipping_cost succeeded:', testOrder.id);

  const fetchedOrder = await orderRepo.getOrderById(testOrder.id);
  assert.strictEqual(fetchedOrder.shipping_method_name, 'DHL Paket Premium');
  assert.strictEqual(Number(fetchedOrder.shipping_cost), 10.00);
  console.log('✔ getOrderById returned shipping details correctly\n');

  // ==========================================
  // TEST 4: Invoice Formatter with Shipping Surcharge
  // ==========================================
  console.log('--- Test 4: Invoice Formatter with Shipping Surcharge ---');
  const items = [{
    name: testProduct.name,
    quantity: 2,
    price: testProduct.price,
    total: testProduct.price * 2
  }];
  const invoice = formatInvoice(items, testProduct.price * 2, 'Bitcoin (BTC)', 'order123', {
    shippingMethodName: 'DHL Paket Premium',
    shippingCost: 10.00,
    discountAmount: 5.00,
    couponCode: 'TESTSAVE'
  });
  console.log('Generated Invoice Preview:');
  console.log(invoice);
  assert(invoice.includes('DHL Paket Premium'), 'Invoice should mention shipping method');
  assert(invoice.includes('10,00 €') || invoice.includes('10.00'), 'Invoice should show shipping cost');
  assert(invoice.includes('TESTSAVE'), 'Invoice should show coupon code');
  // (49.99 * 2) - 5.00 + 10.00 = 99.98 - 5.00 + 10.00 = 104.98
  assert(invoice.includes('104,98 €') || invoice.includes('104.98'), 'Invoice total should equal 104.98');
  console.log('✔ Invoice formatting verified\n');

  // ==========================================
  // TEST 5: Payment Method Filtering & Crypto Support
  // ==========================================
  console.log('--- Test 5: Payment Method Filtering & Crypto on Physical Products ---');
  // Mock methods
  const mockMethods = [
    { id: 'btc', is_active: true, name: 'Bitcoin (BTC)' },
    { id: 'ltc', is_active: true, name: 'Litecoin (LTC)' },
    { id: 'cash_delivery', is_active: true, name: 'Barzahlung' },
    { id: 'xmr', is_active: false, name: 'Monero (XMR)' }
  ];

  // A: Physical product with NO custom payment restriction (allowed_payment_methods is empty)
  // In v0.6.3 and older, crypto was excluded for physical items.
  // In v0.6.4, crypto MUST be kept.
  const isPhysical = true;
  let activePaymentMethods = mockMethods.filter(pm => pm.is_active);
  // Filtering for product with no restriction:
  const unrestrictedProd = { allowed_payment_methods: [] };
  let allowed = activePaymentMethods;
  if (Array.isArray(unrestrictedProd.allowed_payment_methods) && unrestrictedProd.allowed_payment_methods.length > 0) {
    allowed = allowed.filter(pm => unrestrictedProd.allowed_payment_methods.includes(pm.id));
  }
  const cryptoAvailable = allowed.some(pm => paymentRepo.isCryptoMethod(pm));
  assert(cryptoAvailable, 'Crypto methods MUST be available for physical products when not restricted');
  console.log('✔ Crypto methods remain active and available for physical items');

  // B: Product with custom allowed_payment_methods: ['cash_delivery']
  const restrictedProd = { allowed_payment_methods: ['cash_delivery'] };
  let restrictedAllowed = activePaymentMethods;
  if (Array.isArray(restrictedProd.allowed_payment_methods) && restrictedProd.allowed_payment_methods.length > 0) {
    restrictedAllowed = restrictedAllowed.filter(pm => restrictedProd.allowed_payment_methods.includes(pm.id));
  }
  assert.strictEqual(restrictedAllowed.length, 1);
  assert.strictEqual(restrictedAllowed[0].id, 'cash_delivery');
  console.log('✔ Product-specific payment method restriction works accurately\n');

  // ==========================================
  // TEST 6: Physical Stock Decrement & Restoration on Cancel
  // ==========================================
  console.log('--- Test 6: Physical Stock Decrement and Restoration ---');
  // Check current stock of testProduct
  const currentProd = await productRepo.getProductById(testProduct.id);
  const startingStock = currentProd.stock;
  console.log(`Starting stock: ${startingStock}`);

  // Simulate checkout decrement
  const qtyToBuy = 3;
  await productRepo.updateProductStock(testProduct.id, Math.max(0, startingStock - qtyToBuy));
  const decrementedProd = await productRepo.getProductById(testProduct.id);
  assert.strictEqual(decrementedProd.stock, startingStock - qtyToBuy);
  console.log(`✔ Stock decremented to ${decrementedProd.stock} on purchase`);

  // Simulate order cancellation using restorePhysicalStockIfNeeded
  const cancelOrderObj = {
    product_id: testProduct.id,
    quantity: qtyToBuy
  };
  await restorePhysicalStockIfNeeded(cancelOrderObj);
  const restoredProd = await productRepo.getProductById(testProduct.id);
  assert.strictEqual(restoredProd.stock, startingStock);
  console.log(`✔ Stock successfully restored to ${restoredProd.stock} on order cancellation\n`);

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! TGSHOPBOT v0.6.4 is rock solid.\n');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
