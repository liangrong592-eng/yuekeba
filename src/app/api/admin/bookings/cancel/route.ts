import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
function checkAuth(r: NextRequest) { return r.headers.get('authorization')?.replace('Bearer ', '') === 'admin-authenticated' }
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ success: false, error: '缺少预约ID' }, { status: 400 })
  const booking = await db.getBookingById(id)
  if (!booking) return NextResponse.json({ success: false, error: '未找到该预约' }, { status: 404 })
  await db.adminCancelBooking(id)
  return NextResponse.json({ success: true, message: `已取消 ${(booking as any).name} 的预约` })
}
