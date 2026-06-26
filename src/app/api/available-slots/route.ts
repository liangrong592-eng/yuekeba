import { NextRequest, NextResponse } from 'next/server'
import { SLOTS, isSlotBookable, getBeijingDateStr, isSunday } from '@/lib/time'
import db from '@/lib/db'

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') || getBeijingDateStr()
  const sunday = isSunday(date)
  const grouped = await db.getBookingsByDate(date)
  const CAPACITY = 30

  const slots = SLOTS.map((slot) => {
    const { bookable, reason } = isSlotBookable(date, slot)
    const peopleCount = grouped[slot.id]?.length || 0
    const congestionLevel = peopleCount === 0 ? 'low' : peopleCount <= 10 ? 'low' : peopleCount <= 20 ? 'mid' : 'high'
    const isFull = peopleCount >= CAPACITY
    return {
      slotId: slot.id, timeRange: slot.label,
      period: slot.sublabel === '早晨' ? 'morning' : slot.sublabel === '中午' ? 'noon' : 'evening',
      label: slot.label, peopleCount, capacity: CAPACITY, congestionLevel,
      isRecommended: false, isBookable: bookable && !isFull && !sunday, isFull,
      isSunday: sunday, reason: sunday ? '周日休息' : !bookable ? reason : null,
      bookings: grouped[slot.id] || [],
    }
  })

  let recommendedSlot = slots.find(s => s.isBookable && !s.isFull)
  if (recommendedSlot) {
    recommendedSlot = { ...recommendedSlot, isRecommended: true }
  } else if (sunday) {
    const firstSlot = SLOTS[0]
    recommendedSlot = { slotId: firstSlot.id, timeRange: firstSlot.label, period: 'morning', label: firstSlot.label, peopleCount: 0, capacity: CAPACITY, congestionLevel: 'low', isRecommended: true, isBookable: true, isFull: false, isSunday: false, reason: null, bookings: [], _isTomorrow: true }
  } else {
    const firstSlot = SLOTS[0]
    recommendedSlot = { slotId: firstSlot.id, timeRange: firstSlot.label, period: 'morning', label: firstSlot.label, peopleCount: 0, capacity: CAPACITY, congestionLevel: 'low', isRecommended: true, isBookable: true, isFull: false, isSunday: false, reason: null, bookings: [], _isTomorrow: true }
  }

  return NextResponse.json({ date, recommendedSlot, slots })
}
