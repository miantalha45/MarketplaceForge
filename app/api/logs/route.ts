export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ logs: data })
}

export async function DELETE() {
  const { error } = await supabase.from('logs').delete().neq('id', '')
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ cleared: true })
}
