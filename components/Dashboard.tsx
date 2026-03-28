'use client'

import { useState, useCallback } from 'react'
import LogPanel, { type LogEntry } from './LogPanel'
import type { Product, PlatformListing } from '@/lib/supabase'

type DashboardData = {
  product: Product
  listings: PlatformListing[]
}

type AgentResult = {
  logs: LogEntry[]
  product: Product
  listings: PlatformListing[]
  priceChanged: boolean
  stockSynced: boolean
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string | number
  sub?: string
  highlight?: 'green' | 'yellow' | 'red' | null
}) {
  const highlightClass =
    highlight === 'green'
      ? 'border-green-500/40 bg-green-500/5'
      : highlight === 'yellow'
      ? 'border-yellow-500/40 bg-yellow-500/5'
      : highlight === 'red'
      ? 'border-red-500/40 bg-red-500/5'
      : 'border-gray-800 bg-gray-900'

  return (
    <div className={`rounded-xl border p-5 transition-all duration-500 ${highlightClass}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function Badge({ text, color }: { text: string; color: 'green' | 'yellow' | 'gray' }) {
  const cls =
    color === 'green'
      ? 'bg-green-500/10 text-green-400 border-green-500/20'
      : color === 'yellow'
      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      : 'bg-gray-700/40 text-gray-400 border-gray-600/20'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{text}</span>
  )
}

export default function Dashboard({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initial)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<Pick<AgentResult, 'priceChanged' | 'stockSynced'> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shopify = data.listings.find((l) => l.platform === 'shopify')
  const amazon = data.listings.find((l) => l.platform === 'amazon')

  const handleSync = useCallback(async () => {
    setIsSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/sync-data')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData({ product: json.product, listings: json.listings })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const handleRunAgent = useCallback(async () => {
    setIsRunning(true)
    setError(null)
    setLogs([])
    try {
      const res = await fetch('/api/run-agent', { method: 'POST' })
      const json: AgentResult = await res.json()
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Agent failed')
      setData({ product: json.product, listings: json.listings })
      setLogs(json.logs)
      setLastResult({ priceChanged: json.priceChanged, stockSynced: json.stockSynced })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed')
    } finally {
      setIsRunning(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">MarketplaceForge</h1>
            <p className="text-xs text-gray-500">Dynamic pricing & inventory sync</p>
          </div>
          <div className="flex items-center gap-3">
            {lastResult && (
              <div className="flex gap-2">
                {lastResult.priceChanged && <Badge text="Price updated" color="yellow" />}
                {lastResult.stockSynced && <Badge text="Stock synced" color="green" />}
                {!lastResult.priceChanged && !lastResult.stockSynced && (
                  <Badge text="No changes" color="gray" />
                )}
              </div>
            )}
            <button
              onClick={handleSync}
              disabled={isSyncing || isRunning}
              className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSyncing ? 'Syncing...' : 'Sync Data'}
            </button>
            <button
              onClick={handleRunAgent}
              disabled={isSyncing || isRunning}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {isRunning ? 'Running...' : 'Run Agent'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Product title */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{data.product.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Single product · 2 platforms</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="My Price (Shopify)"
            value={shopify ? `$${shopify.price.toFixed(2)}` : '—'}
            sub="Active listing"
            highlight={lastResult?.priceChanged ? 'yellow' : null}
          />
          <StatCard
            label="Competitor Price (Amazon)"
            value={amazon ? `$${amazon.price.toFixed(2)}` : '—'}
            sub="Market reference"
            highlight={null}
          />
          <StatCard
            label="Global Stock"
            value={data.product.global_stock}
            sub="Total units managed"
            highlight={lastResult?.stockSynced ? 'green' : null}
          />
          <StatCard
            label="Price Spread"
            value={
              shopify && amazon
                ? `$${Math.abs(shopify.price - amazon.price).toFixed(2)}`
                : '—'
            }
            sub={
              shopify && amazon
                ? shopify.price > amazon.price
                  ? 'We are higher'
                  : shopify.price < amazon.price
                  ? 'We are lower'
                  : 'At parity'
                : undefined
            }
            highlight={
              shopify && amazon && shopify.price > amazon.price ? 'red' : null
            }
          />
        </div>

        {/* Platform cards + Log panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Platform listings */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Platform Listings
            </h3>

            {[shopify, amazon].map((listing) => {
              if (!listing) return null
              const isShopify = listing.platform === 'shopify'
              return (
                <div
                  key={listing.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isShopify
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        {isShopify ? 'SH' : 'AZ'}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{listing.platform}</p>
                        <p className="text-xs text-gray-500">
                          {isShopify ? 'Our storefront' : 'Competitor reference'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      text="Active"
                      color={isShopify ? 'green' : 'gray'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Price</p>
                      <p className="text-lg font-semibold">${listing.price.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Stock</p>
                      <p className="text-lg font-semibold">{listing.stock}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Log panel */}
          <div className="lg:col-span-2 flex flex-col" style={{ minHeight: '400px' }}>
            <LogPanel logs={logs} isRunning={isRunning} />
          </div>
        </div>
      </main>
    </div>
  )
}
