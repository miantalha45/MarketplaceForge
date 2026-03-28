export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import * as TinyFish from '@/lib/tinyfish'

export async function GET() {
  try {
    // Load product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .limit(1)
      .single()

    if (productError || !product) {
      return Response.json({ error: 'Product not found' }, { status: 404 })
    }

    // Load listings
    const { data: listings, error: listingsError } = await supabase
      .from('platform_listings')
      .select('*')
      .eq('product_id', product.id)

    if (listingsError || !listings) {
      return Response.json({ error: 'Listings not found' }, { status: 404 })
    }

    // Fetch fresh prices from TinyFish (mock)
    const [amazonPrice, shopifyPrice] = await Promise.all([
      TinyFish.getAmazonPrice({ name: product.name, platform: 'amazon' }),
      TinyFish.getShopifyPrice({ name: product.name, platform: 'shopify' }),
    ])

    // Update DB with fresh prices
    const shopifyListing = listings.find((l) => l.platform === 'shopify')
    const amazonListing = listings.find((l) => l.platform === 'amazon')

    if (shopifyListing) {
      await supabase
        .from('platform_listings')
        .update({ price: shopifyPrice.price, updated_at: new Date().toISOString() })
        .eq('id', shopifyListing.id)
    }

    if (amazonListing) {
      await supabase
        .from('platform_listings')
        .update({ price: amazonPrice.price, updated_at: new Date().toISOString() })
        .eq('id', amazonListing.id)
    }

    // Return updated data
    return Response.json({
      product: { ...product },
      listings: listings.map((l) => ({
        ...l,
        price: l.platform === 'shopify' ? shopifyPrice.price : amazonPrice.price,
      })),
      syncedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[sync-data]', err)
    return Response.json({ error: 'Sync failed' }, { status: 500 })
  }
}
