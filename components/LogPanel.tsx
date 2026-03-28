'use client'

import { useEffect, useRef } from 'react'

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

  const getLogStyle = (message: string) => {
    if (message.startsWith('ERROR')) return 'text-red-400'
    if (message.includes('✓')) return 'text-green-400'
    if (message.includes('Agent run complete')) return 'text-green-400 font-semibold'
    if (message.startsWith('Fetching') || message.startsWith('Running') || message.startsWith('Saving')) {
      return 'text-blue-400'
    }
    if (message.includes('→') || message.includes('price') || message.includes('stock')) {
      return 'text-yellow-300'
    }
    return 'text-gray-300'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Activity Log
        </h2>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Running...
          </span>
        )}
        {!isRunning && logs.length > 0 && (
          <span className="text-xs text-gray-500">{logs.length} entries</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-950 rounded-lg border border-gray-800 p-4 font-mono text-xs min-h-0">
        {logs.length === 0 ? (
          <p className="text-gray-600 italic">No activity yet. Run the agent to see logs.</p>
        ) : (
          <>
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 mb-1 leading-relaxed">
                <span className="text-gray-600 shrink-0 select-none">
                  {formatTime(log.timestamp)}
                </span>
                <span className={getLogStyle(log.message)}>{log.message}</span>
              </div>
            ))}
            {isRunning && (
              <div className="flex gap-3 mb-1 leading-relaxed">
                <span className="text-gray-600 shrink-0">...</span>
                <span className="text-gray-500 animate-pulse">Processing</span>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
