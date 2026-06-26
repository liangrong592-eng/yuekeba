import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
function checkAuth(r: NextRequest) { return r.headers.get('authorization')?.replace('Bearer ', '') === 'admin-authenticated' }
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  const date = request.nextUrl.searchParams.get('date') || undefined
  const slot = request.nextUrl.searchParams.get('slot') || undefined
  const status = request.nextUrl.searchParams.get('status') || 'active'
  const search = request.nextUrl.searchParams.get('search') || undefined
  const bookings = await db.getAdminBookings({ date, slot, status, search })
  const totalActive = await db.getActiveCount({ date, slot, search })
  const totalCancelled = await db.getCancelledCount({ date, slot, search })
  return NextResponse.json({ bookings, stats: { totalActive, totalCancelled, total: bookings.length } })
}
