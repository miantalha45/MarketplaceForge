/**
 * TinyFish Integration Layer
 *
 * Currently uses mock responses. Replace the mock implementations
 * with real TinyFish API calls once credentials are available.
 * The function signatures and return shapes stay the same.
 */

export type PlatformProduct = {
  name: string
  platform: 'shopify' | 'amazon'
}

export type PriceResult = {
  price: number
  source: 'live' | 'mock'
}

export type StockResult = {
  stock: number
  source: 'live' | 'mock'
}

export type UpdateResult = {
  success: boolean
  source: 'live' | 'mock'
}

// Simulate network latency for realistic demo feel
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Fetch the current Amazon listing price for a product.
 * Real implementation: use TinyFish to scrape/query Amazon.
 */
export async function getAmazonPrice(product: PlatformProduct): Promise<PriceResult> {
  await delay(300)
  // Mock: Amazon is slightly undercutting our Shopify price
  return { price: 47.99, source: 'mock' }
}

/**
 * Fetch the current Shopify listing price for a product.
 * Real implementation: call Shopify API via TinyFish.
 */
export async function getShopifyPrice(product: PlatformProduct): Promise<PriceResult> {
  await delay(200)
  return { price: 49.99, source: 'mock' }
}

/**
 * Fetch current stock levels from a platform.
 * Real implementation: query platform inventory via TinyFish.
 */
export async function getPlatformStock(
  product: PlatformProduct
): Promise<StockResult> {
  await delay(200)
  const mockStock = product.platform === 'shopify' ? 60 : 40
  return { stock: mockStock, source: 'mock' }
}

/**
 * Update the price of a Shopify listing.
 * Real implementation: use TinyFish to trigger Shopify price update.
 */
export async function updateShopifyPrice(
  product: PlatformProduct,
  newPrice: number
): Promise<UpdateResult> {
  await delay(400)
  console.log(`[TinyFish] updateShopifyPrice → ${newPrice}`)
  return { success: true, source: 'mock' }
}

/**
 * Sync stock level to a specific platform.
 * Real implementation: use TinyFish to update platform inventory.
 */
export async function updateStock(
  product: PlatformProduct,
  stock: number
): Promise<UpdateResult> {
  await delay(300)
  console.log(`[TinyFish] updateStock on ${product.platform} → ${stock}`)
  return { success: true, source: 'mock' }
}
