import { supabase, type Product, type PlatformListing } from './supabase'
import * as TinyFish from './tinyfish'

export type AgentLog = {
  message: string
  timestamp: string
}

export type AgentResult = {
  logs: AgentLog[]
  product: Product
  listings: PlatformListing[]
  priceChanged: boolean
  stockSynced: boolean
}

function now(): string {
  return new Date().toISOString()
}

/**
 * Run the full agent cycle:
 * 1. Fetch current data
 * 2. Apply pricing rule
 * 3. Apply inventory rule
 * 4. Persist changes to DB
 * 5. Return structured result with logs
 */
export async function runAgent(): Promise<AgentResult> {
  const logs: AgentLog[] = []
  const log = (message: string) => logs.push({ message, timestamp: now() })

  // ── 1. Load product ──────────────────────────────────────────────────────
  log('Fetching product data from database...')
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .limit(1)
    .single()

  if (productError || !products) {
    log(`ERROR: Could not load product — ${productError?.message}`)
    throw new Error('Product not found')
  }

  const product: Product = products
  log(`Product loaded: "${product.name}" (global stock: ${product.global_stock})`)

  // ── 2. Load platform listings ────────────────────────────────────────────
  log('Fetching platform listings...')
  const { data: listingsData, error: listingsError } = await supabase
    .from('platform_listings')
    .select('*')
    .eq('product_id', product.id)

  if (listingsError || !listingsData) {
    log(`ERROR: Could not load listings — ${listingsError?.message}`)
    throw new Error('Listings not found')
  }

  const listings: PlatformListing[] = listingsData
  const shopifyListing = listings.find((l) => l.platform === 'shopify')!
  const amazonListing = listings.find((l) => l.platform === 'amazon')!

  log(`Shopify price: $${shopifyListing.price}  |  Stock: ${shopifyListing.stock}`)
  log(`Amazon price: $${amazonListing.price}  |  Stock: ${amazonListing.stock}`)

  // ── 3. Fetch live prices via TinyFish ────────────────────────────────────
  log('Fetching Amazon competitor price via TinyFish...')
  const amazonPriceResult = await TinyFish.getAmazonPrice({
    name: product.name,
    platform: 'amazon',
  })
  const competitorPrice = amazonPriceResult.price
  log(`Competitor price (Amazon) = $${competitorPrice} [${amazonPriceResult.source}]`)

  log('Fetching Shopify current price via TinyFish...')
  const shopifyPriceResult = await TinyFish.getShopifyPrice({
    name: product.name,
    platform: 'shopify',
  })
  const myPrice = shopifyPriceResult.price
  log(`My price (Shopify) = $${myPrice} [${shopifyPriceResult.source}]`)

  // ── 4. Pricing rule ──────────────────────────────────────────────────────
  let priceChanged = false
  let newPrice = myPrice

  log('Running pricing rule...')
  if (competitorPrice < myPrice) {
    newPrice = parseFloat((competitorPrice - 1).toFixed(2))
    log(`Competitor undercuts us → setting new price to $${newPrice}`)

    log(`Updating Shopify price to $${newPrice} via TinyFish...`)
    await TinyFish.updateShopifyPrice({ name: product.name, platform: 'shopify' }, newPrice)

    const { error: priceUpdateError } = await supabase
      .from('platform_listings')
      .update({ price: newPrice, updated_at: new Date().toISOString() })
      .eq('id', shopifyListing.id)

    if (priceUpdateError) {
      log(`ERROR updating Shopify price in DB: ${priceUpdateError.message}`)
    } else {
      shopifyListing.price = newPrice
      priceChanged = true
      log(`Shopify price updated to $${newPrice} ✓`)
    }
  } else {
    log(`Our price ($${myPrice}) is competitive — no change needed`)
  }

  // ── 5. Inventory rule ────────────────────────────────────────────────────
  let stockSynced = false
  const totalPlatformStock = listings.reduce((sum, l) => sum + l.stock, 0)
  const saleDetected = totalPlatformStock < product.global_stock

  log('Running inventory rule...')
  if (saleDetected) {
    const soldUnits = product.global_stock - totalPlatformStock
    const newGlobalStock = totalPlatformStock
    log(`Sale detected! Sold ${soldUnits} unit(s). Reducing global stock to ${newGlobalStock}`)

    const shopifyShare = Math.ceil(newGlobalStock * 0.6)
    const amazonShare = newGlobalStock - shopifyShare

    log(`Syncing stock — Shopify: ${shopifyShare}, Amazon: ${amazonShare}`)

    await TinyFish.updateStock({ name: product.name, platform: 'shopify' }, shopifyShare)
    await TinyFish.updateStock({ name: product.name, platform: 'amazon' }, amazonShare)

    await supabase
      .from('products')
      .update({ global_stock: newGlobalStock })
      .eq('id', product.id)

    await supabase
      .from('platform_listings')
      .update({ stock: shopifyShare, updated_at: new Date().toISOString() })
      .eq('id', shopifyListing.id)

    await supabase
      .from('platform_listings')
      .update({ stock: amazonShare, updated_at: new Date().toISOString() })
      .eq('id', amazonListing.id)

    product.global_stock = newGlobalStock
    shopifyListing.stock = shopifyShare
    amazonListing.stock = amazonShare
    stockSynced = true
    log(`Stock synced across platforms ✓`)
  } else {
    log(`Stock levels are consistent — no sync needed`)
  }

  // ── 6. Persist all logs to DB ────────────────────────────────────────────
  log('Saving activity logs...')
  await supabase.from('logs').insert(
    logs.map((l) => ({ message: l.message, created_at: l.timestamp }))
  )
  log('Agent run complete ✓')

  return {
    logs,
    product,
    listings: [shopifyListing, amazonListing],
    priceChanged,
    stockSynced,
  }
}
