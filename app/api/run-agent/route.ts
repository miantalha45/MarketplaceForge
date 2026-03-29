export const dynamic = 'force-dynamic'

import { runAgent } from '@/lib/agent'

export async function POST() {
  try {
    
    const result = await runAgent()
    return Response.json(result)
  } catch (err) {
    console.error('[run-agent]', err)
    const message = err instanceof Error ? err.message : 'Agent run failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
