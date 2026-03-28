export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import Dashboard from '@/components/Dashboard'
import type { Product, PlatformListing } from '@/lib/supabase'

async function getInitialData(): Promise<{ product: Product; listings: PlatformListing[] }> {
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .limit(1)
    .single()

  const { data: listings } = await supabase
    .from('platform_listings')
    .select('*')
    .eq('product_id', product?.id ?? '')

  return {
    product: product ?? { id: '', name: 'Wireless Earbuds Pro', global_stock: 100 },
    listings: listings ?? [
      { id: '1', product_id: '', platform: 'shopify', price: 49.99, stock: 60 },
      { id: '2', product_id: '', platform: 'amazon', price: 47.99, stock: 40 },
    ],
  }
}

export default async function DashboardPage() {
  const initial = await getInitialData()
  return <Dashboard initial={initial} />
}
