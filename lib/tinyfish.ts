/**
 * TinyFish Integration Layer
 *
 * Uses the TinyFish SSE API: https://agent.tinyfish.ai/v1/automation/run-sse
 * Auth: X-API-Key header with TINYFISH_API_KEY env var.
 *
 * Each function falls back to mock values if the API key is not set or a call fails,
 * so the app works in demo mode without credentials.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface TinyFishEvent {
  type: 'STARTED' | 'STREAMING_URL' | 'PROGRESS' | 'COMPLETE' | 'ERROR'
  runId?: string
  streamingUrl?: string
  purpose?: string
  status?: string
  resultJson?: Record<string, unknown>
  error?: string
}

// ── Core SSE client (matches tinyfish-acc/src/lib/tinyfish/client.ts) ──────────

const TINYFISH_API_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse'

async function runTinyFish(
  url: string,
  goal: string,
  browserProfile: 'lite' | 'stealth' = 'stealth'
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.TINYFISH_API_KEY
  if (!apiKey) {
    console.warn('[TinyFish] TINYFISH_API_KEY not set — using mock mode')
    return null
  }

  const response = await fetch(TINYFISH_API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, goal, browserProfile }),
  })

  if (!response.ok) {
    throw new Error(`TinyFish API error: ${response.status} ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body from TinyFish')

  const decoder = new TextDecoder()
  let resultJson: Record<string, unknown> | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n').filter((l) => l.startsWith('data: '))

      for (const line of lines) {
        try {
          const event: TinyFishEvent = JSON.parse(line.slice(6))

          if (event.type === 'COMPLETE' && event.resultJson) {
            resultJson = event.resultJson
          }
          if (event.type === 'ERROR') {
            throw new Error(event.error ?? 'TinyFish automation failed')
          }
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) continue
          throw parseErr
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return resultJson
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetch the current Amazon listing price for a product.
 * Goal: navigate to Amazon, search for the product, return numeric price.
 */
export async function getAmazonPrice(product: PlatformProduct): Promise<PriceResult> {
  try {
    const result = await runTinyFish(
      `https://www.amazon.com/s?k=${encodeURIComponent(product.name)}`,
      `Find the product named exactly or similar to "${product.name}" and return ONLY its current numeric price as a JSON object with key "price" (number, no currency symbol).`
    )
    const price = parseFloat(String(result?.price ?? ''))
    if (!isNaN(price) && price > 0) return { price, source: 'live' }
    throw new Error('Invalid price in response')
  } catch (err) {
    console.error('[TinyFish] getAmazonPrice failed:', err)
    return { price: 47.99, source: 'mock' }
  }
}

/**
 * Fetch the current Shopify listing price for a product.
 * Goal: navigate to the Shopify admin, find the product, return its price.
 */
export async function getShopifyPrice(product: PlatformProduct): Promise<PriceResult> {
  try {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN
    if (!shopifyDomain) throw new Error('SHOPIFY_STORE_DOMAIN not configured')

    const result = await runTinyFish(
      `https://${shopifyDomain}/admin/products`,
      `Find the product "${product.name}" in the Shopify admin panel and return ONLY its current numeric price as a JSON object with key "price" (number, no currency symbol).`
    )
    const price = parseFloat(String(result?.price ?? ''))
    if (!isNaN(price) && price > 0) return { price, source: 'live' }
    throw new Error('Invalid price in response')
  } catch (err) {
    console.error('[TinyFish] getShopifyPrice failed:', err)
    return { price: 49.99, source: 'mock' }
  }
}

/**
 * Fetch current stock level from a platform.
 */
export async function getPlatformStock(product: PlatformProduct): Promise<StockResult> {
  try {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN
    const url =
      product.platform === 'shopify' && shopifyDomain
        ? `https://${shopifyDomain}/admin/inventory`
        : 'https://sellercentral.amazon.com/inventory'

    const result = await runTinyFish(
      url,
      `Find the product "${product.name}" and return ONLY its available stock quantity as a JSON object with key "stock" (integer).`
    )
    const stock = parseInt(String(result?.stock ?? ''), 10)
    if (!isNaN(stock) && stock >= 0) return { stock, source: 'live' }
    throw new Error('Invalid stock in response')
  } catch (err) {
    console.error('[TinyFish] getPlatformStock failed:', err)
    return { stock: product.platform === 'shopify' ? 60 : 40, source: 'mock' }
  }
}

/**
 * Update the price of a Shopify listing.
 * Goal: navigate to Shopify admin, find the product, update its price, save.
 */
export async function updateShopifyPrice(
  product: PlatformProduct,
  newPrice: number
): Promise<UpdateResult> {
  try {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN
    if (!shopifyDomain) throw new Error('SHOPIFY_STORE_DOMAIN not configured')

    console.log(`[TinyFish] Updating Shopify price → $${newPrice}`)
    await runTinyFish(
      `https://${shopifyDomain}/admin/products`,
      `Locate the product "${product.name}", update its price to exactly ${newPrice}, and click the save button. Return JSON { "success": true } when completed.`
    )
    return { success: true, source: 'live' }
  } catch (err) {
    console.error('[TinyFish] updateShopifyPrice failed:', err)
    return { success: true, source: 'mock' }
  }
}

/**
 * Sync stock level to a specific platform.
 */
export async function updateStock(
  product: PlatformProduct,
  stock: number
): Promise<UpdateResult> {
  try {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN
    const url =
      product.platform === 'shopify' && shopifyDomain
        ? `https://${shopifyDomain}/admin/inventory`
        : 'https://sellercentral.amazon.com/inventory'

    console.log(`[TinyFish] Updating ${product.platform} stock → ${stock}`)
    await runTinyFish(
      url,
      `Locate the product "${product.name}", update its available stock to exactly ${stock}, and save the changes. Return JSON { "success": true } when completed.`
    )
    return { success: true, source: 'live' }
  } catch (err) {
    console.error(`[TinyFish] updateStock (${product.platform}) failed:`, err)
    return { success: true, source: 'mock' }
  }
}
