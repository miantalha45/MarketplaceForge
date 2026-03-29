'use client'

import { useState, useCallback } from 'react'
import LogPanel, { type LogEntry } from './LogPanel'
import type { Product, PlatformListing } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon,
  glowClass,
  accentClass,
  bgClass,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  glowClass?: string
  accentClass: string
  bgClass: string
}) {
  return (
    <Card
      className={`relative overflow-hidden border-white/[0.07] transition-all duration-500 ${glowClass ?? ''}`}
      style={{ background: 'oklch(0.13 0.022 265)' }}
    >
      {/* Gradient corner accent */}
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10 ${bgClass}`} />
      <CardHeader className="pb-1 pt-5 px-5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-white-500 uppercase tracking-widest">
            {label}
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-md ${bgClass} bg-opacity-20 ${accentClass}`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
        {sub && <p className="text-xs text-white-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── Platform Card ─────────────────────────────────────────────────────────────
function PlatformCard({
  listing,
  priceChanged,
  stockSynced,
}: {
  listing: PlatformListing
  priceChanged: boolean
  stockSynced: boolean
}) {
  const isShopify = listing.platform === 'shopify'

  return (
    <Card
      className={`border-white/[0.07] transition-all duration-500 ${
        isShopify && priceChanged ? 'glow-amber border-amber-500/20' : ''
      } ${isShopify && stockSynced ? 'glow-green border-emerald-500/20' : ''}`}
      style={{ background: 'oklch(0.13 0.022 265)' }}
    >
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-md font-black ${
                isShopify
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-orange-500/15 text-orange-400'
              }`}
            >
              {isShopify ? 'SH' : 'AZ'}
            </div>
            <div>
              <p className="font-semibold capitalize text-md">{listing.platform}</p>
              <p className="text-xs text-white-500">
                {isShopify ? 'Our storefront' : 'Competitor'}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              isShopify
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[16px]'
                : 'border-slate-600/40 bg-slate-700/20 text-white-400 text-[16px]'
            }
          >
            {isShopify ? 'Active' : 'Reference'}
          </Badge>
        </div>
      </CardHeader>

      <Separator className="bg-white/[0.05] mx-5 w-auto" />

      <CardContent className="px-5 pb-5 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.05] p-4">
            <p className="text-[16px] text-white-500 uppercase tracking-wider mb-2">Price</p>
            <p
              className={`text-2xl font-bold tabular-nums ${
                isShopify && priceChanged ? 'text-amber-300' : 'text-white'
              }`}
            >
              ${listing.price.toFixed(2)}
            </p>
            {isShopify && priceChanged && (
              <span className="text-[16px] text-amber-400 mt-1 block">Updated</span>
            )}
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.05] p-4">
            <p className="text-[16px] text-white-500 uppercase tracking-wider mb-2">Stock</p>
            <p
              className={`text-2xl font-bold tabular-nums ${
                stockSynced ? 'text-emerald-400' : 'text-white'
              }`}
            >
              {listing.stock}
            </p>
            {stockSynced && (
              <span className="text-[16px] text-emerald-400 mt-1 block">Synced</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export default function Dashboard({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initial)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<Pick<AgentResult, 'priceChanged' | 'stockSynced'> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shopify = data.listings.find((l) => l.platform === 'shopify')
  const amazon = data.listings.find((l) => l.platform === 'amazon')

  const spread =
    shopify && amazon ? Math.abs(shopify.price - amazon.price).toFixed(2) : null
  const weAreHigher = shopify && amazon && shopify.price > amazon.price

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
    setLastResult(null)
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
    <div className="min-h-screen bg-background grid-bg">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center glow-primary">
              <span className="text-primary text-xs font-black">MF</span>
            </div>
            <div>
              <h1 className="text-md font-bold gradient-text">MarketplaceForge</h1>
              <p className="text-[16px] text-white-600 leading-none mt-0.5">
                Dynamic pricing · Inventory sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Result badges */}
            {lastResult && (
              <div className="hidden sm:flex gap-2 mr-2">
                {lastResult.priceChanged && (
                  <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[16px] gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Price updated
                  </Badge>
                )}
                {lastResult.stockSynced && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[16px] gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Stock synced
                  </Badge>
                )}
                {!lastResult.priceChanged && !lastResult.stockSynced && (
                  <Badge className="bg-slate-700/30 text-white-400 border border-slate-600/30 text-[16px]">
                    No changes needed
                  </Badge>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || isRunning}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white-300 hover:text-white text-xs h-8"
            >
              {isSyncing ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  Syncing
                </span>
              ) : (
                'Sync Data'
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleRunAgent}
              disabled={isSyncing || isRunning}
              className="bg-primary hover:bg-primary/90 text-primary-foreground glow-primary text-xs h-8 font-semibold"
            >
              {isRunning ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Running...
                </span>
              ) : (
                'Run Agent'
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3.5 text-md text-red-400 flex items-center gap-3">
            <span className="text-red-500 text-base">✕</span>
            {error}
          </div>
        )}

        {/* ── Product Hero ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{data.product.name}</h2>
            <p className="text-md text-white-500 mt-0.5">
              1 product &nbsp;·&nbsp; 2 platforms &nbsp;·&nbsp; Live pricing engine
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-white-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System active
          </div>
        </div>

        {/* ── Stat Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="My Price"
            value={shopify ? `$${shopify.price.toFixed(2)}` : '—'}
            sub="Shopify listing"
            icon="🏪"
            accentClass="text-emerald-400"
            bgClass="bg-emerald-500"
            glowClass={lastResult?.priceChanged ? 'glow-amber border-amber-500/20' : ''}
          />
          <StatCard
            label="Competitor"
            value={amazon ? `$${amazon.price.toFixed(2)}` : '—'}
            sub="Amazon reference"
            icon="📦"
            accentClass="text-orange-400"
            bgClass="bg-orange-500"
          />
          <StatCard
            label="Global Stock"
            value={data.product.global_stock}
            sub="Total units"
            icon="📊"
            accentClass="text-sky-400"
            bgClass="bg-sky-500"
            glowClass={lastResult?.stockSynced ? 'glow-green border-emerald-500/20' : ''}
          />
          <StatCard
            label="Price Spread"
            value={spread ? `$${spread}` : '—'}
            sub={weAreHigher ? 'We are higher — agent will adjust' : 'We are competitive'}
            icon={weAreHigher ? '⚠️' : '✅'}
            accentClass={weAreHigher ? 'text-red-400' : 'text-emerald-400'}
            bgClass={weAreHigher ? 'bg-red-500' : 'bg-emerald-500'}
            glowClass={weAreHigher ? 'glow-red border-red-500/20' : ''}
          />
        </div>

        {/* ── Platforms + Log ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Platform cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-white-500 uppercase tracking-widest">
                Platform Listings
              </span>
              <div className="h-px flex-1 bg-white/[0.05]" />
            </div>
            {[shopify, amazon].map((listing) =>
              listing ? (
                <PlatformCard
                  key={listing.id}
                  listing={listing}
                  priceChanged={lastResult?.priceChanged ?? false}
                  stockSynced={lastResult?.stockSynced ?? false}
                />
              ) : null
            )}
          </div>

          {/* Log panel */}
          <div className="lg:col-span-3 flex flex-col" style={{ minHeight: 420 }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[14px] font-semibold text-white-500 uppercase tracking-widest">
                Agent Activity
              </span>
              <div className="h-px flex-1 bg-white/[0.05]" />
            </div>
            <div className="flex-1">
              <LogPanel logs={logs} isRunning={isRunning} />
            </div>
          </div>
        </div>

        {/* ── Decision Rules ────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[14px] font-semibold text-white-500 uppercase tracking-widest">
              Agent Rules
            </span>
            <div className="h-px flex-1 bg-white/[0.05]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-white/[0.07]" style={{ background: 'oklch(0.13 0.022 265)' }}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-base shrink-0">
                    💰
                  </div>
                  <div>
                    <p className="text-md font-semibold mb-1">Dynamic Pricing</p>
                    <p className="text-xs text-white-500 leading-relaxed font-mono">
                      IF competitor_price &lt; my_price<br />
                      &nbsp;&nbsp;→ new_price = competitor_price − 1<br />
                      ELSE keep same
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/[0.07]" style={{ background: 'oklch(0.13 0.022 265)' }}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-base shrink-0">
                    📦
                  </div>
                  <div>
                    <p className="text-md font-semibold mb-1">Inventory Sync</p>
                    <p className="text-xs text-white-500 leading-relaxed font-mono">
                      IF sale detected on any platform<br />
                      &nbsp;&nbsp;→ reduce global_stock<br />
                      &nbsp;&nbsp;→ sync all platform stock
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
