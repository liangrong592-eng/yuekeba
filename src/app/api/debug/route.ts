import { NextResponse } from 'next/server'
import { getBeijingNow, getBeijingDateStr } from '@/lib/time'

export async function GET() {
  const now = new Date()
  const beijing = getBeijingNow()
  
  return NextResponse.json({
    serverUTC: now.toISOString(),
    serverTZOffset: now.getTimezoneOffset(),
    beijingNow: beijing.toISOString(),
    beijingHours: beijing.getHours(),
    beijingMinutes: beijing.getMinutes(),
    beijingDate: getBeijingDateStr(),
    beijingTimestamp: beijing.getTime(),
  })
}
