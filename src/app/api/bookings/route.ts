import { NextRequest, NextResponse } from 'next/server'
import { SLOTS, isSlotBookable, isSunday } from '@/lib/time'
import db from '@/lib/db'
import { createBooking } from '@/lib/booking'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, date, slot } = body
    if (!name || !date || !slot) return NextResponse.json({ success: false, error: '请填写完整信息' }, { status: 400 })
    const trimmedName = name.trim()
    if (!trimmedName) return NextResponse.json({ success: false, error: '名字不能为空' }, { status: 400 })
    const slotDef = SLOTS.find(s => s.id === slot)
    if (!slotDef) return NextResponse.json({ success: false, error: '无效的时段' }, { status: 400 })
    if (isSunday(date)) return NextResponse.json({ success: false, error: '周日不可预约' }, { status: 400 })
    const { bookable, reason } = isSlotBookable(date, slotDef)
    if (!bookable) return NextResponse.json({ success: false, error: reason || '该时段不可预约' }, { status: 400 })
    const existing = await db.findBooking(trimmedName, date)
    if (existing) return NextResponse.json({ success: false, error: `您今天已预约了 ${(existing as any).slot} 的时段` }, { status: 409 })
    const booking = await createBooking(trimmedName, date, slot)
    return NextResponse.json({ success: true, booking: { name: booking.name, date: booking.date, slot: booking.slot, bookingNumber: booking.bookingNumber, confirmCode: booking.confirmCode } })
  } catch (err) {
    console.error('Failed to create booking:', err)
    return NextResponse.json({ success: false, error: '预约失败，请重试' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') || require('@/lib/time').getBeijingDateStr()
  const grouped = await db.getBookingsByDate(date)
  return NextResponse.json({ date, bookings: grouped })
}
