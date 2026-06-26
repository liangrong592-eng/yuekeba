import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, confirmCode } = body
    if (!name || !confirmCode) return NextResponse.json({ success: false, error: '请填写完整信息' }, { status: 400 })
    const bookings = await db.findBookingsByName(name.trim())
    if (bookings.length === 0) return NextResponse.json({ success: false, error: '未找到有效预约' }, { status: 404 })
    const matched = bookings.find((b: any) => b.confirmCode === confirmCode)
    if (!matched) return NextResponse.json({ success: false, error: '确认码错误' }, { status: 403 })
    // 检查是否可取消（提前2小时）
    const { canCancelBooking } = await import('@/lib/time')
    const { SLOTS } = await import('@/lib/time')
    const slotDef = SLOTS.find(s => s.id === (matched as any).slot)
    if (slotDef) {
      const { cancellable, reason } = canCancelBooking((matched as any).date, slotDef)
      if (!cancellable) return NextResponse.json({ success: false, error: reason || '该预约不可取消' }, { status: 400 })
    }
    await db.cancelBooking((matched as any).id)
    return NextResponse.json({ success: true, message: `已取消 ${(matched as any).date} ${(matched as any).slot} 的预约` })
  } catch (err) {
    console.error('Failed to cancel:', err)
    return NextResponse.json({ success: false, error: '取消失败，请重试' }, { status: 500 })
  }
}
