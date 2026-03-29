'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type LogEntry = {
  message: string
  timestamp: string
}

type Props = {
  logs: LogEntry[]
  isRunning: boolean
}

export default function LogPanel({ logs, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return '--:--:--'
    }
  }

  type LogMeta = { color: string; dot: string; prefix: string }

  const getLogMeta = (message: string): LogMeta => {
    if (message.startsWith('ERROR'))
      return { color: 'text-red-400', dot: 'bg-red-500', prefix: 'ERR' }
    if (message.includes('✓') || message.includes('complete'))
      return { color: 'text-emerald-400', dot: 'bg-emerald-500', prefix: 'OK ' }
    if (message.startsWith('Fetching') || message.startsWith('Saving'))
      return { color: 'text-sky-400', dot: 'bg-sky-500', prefix: 'GET' }
    if (message.startsWith('Running'))
      return { color: 'text-violet-400', dot: 'bg-violet-500', prefix: 'RUN' }
    if (message.startsWith('Updating') || message.startsWith('Syncing') || message.startsWith('Setting'))
      return { color: 'text-amber-300', dot: 'bg-amber-400', prefix: 'SET' }
    if (message.includes('→') || message.includes('price') || message.includes('stock'))
      return { color: 'text-amber-300', dot: 'bg-amber-400', prefix: 'DAT' }
    return { color: 'text-white-400', dot: 'bg-slate-600', prefix: 'INF' }
  }

  return (
    <Card className="flex flex-col h-full bg-[oklch(0.09_0.02_265)] border-white/[0.06]">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-white-400 uppercase tracking-widest">
              Activity Log
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Badge
                variant="outline"
                className="text-sky-400 border-sky-500/30 bg-sky-500/10 text-[16px] px-2 py-0.5 gap-1.5 font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Running
              </Badge>
            )}
            {!isRunning && logs.length > 0 && (
              <Badge
                variant="outline"
                className="text-white-500 border-white/10 bg-white/5 text-[16px] px-2 py-0.5 font-mono"
              >
                {logs.length} entries
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-3 pb-3 min-h-0">
        <div className="h-full overflow-y-auto rounded-lg bg-black/40 border border-white/5 p-4 font-mono text-[14px] leading-relaxed">
          {/* Terminal dots */}
          <div className="flex gap-1.5 mb-4 pb-3 border-b border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            <span className="ml-2 text-white-600 text-[16px]">marketplace-agent — bash</span>
          </div>

          {logs.length === 0 && !isRunning ? (
            <div className="flex flex-col gap-1">
              <span className="text-white-600">
                {'>'} Waiting for agent run...
              </span>
              <span className="text-white-700 text-[16px]">
                Click <span className="text-violet-400">Run Agent</span> to start the decision engine
              </span>
            </div>
          ) : (
            <>
              {logs.map((log, i) => {
                const meta = getLogMeta(log.message)
                return (
                  <div key={i} className="flex gap-3 mb-1.5 group">
                    <span className="text-white-700 shrink-0 select-none tabular-nums">
                      {formatTime(log.timestamp)}
                    </span>
                    <span className={`shrink-0 select-none px-1.5 rounded text-[9px] font-bold tracking-wider my-auto h-4 flex items-center ${meta.color} bg-white/5`}>
                      {meta.prefix}
                    </span>
                    <span className={`${meta.color} break-all`}>{log.message}</span>
                  </div>
                )
              })}
              {isRunning && (
                <div className="flex gap-3 mb-1.5 mt-2">
                  <span className="text-white-700 shrink-0">{'>'}</span>
                  <span className="text-sky-500 animate-pulse">Processing...</span>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  )
}
