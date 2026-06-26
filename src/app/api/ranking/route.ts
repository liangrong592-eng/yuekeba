import { NextResponse } from 'next/server'
import { getCurrentMonthPrefix } from '@/lib/time'
import { getPublicRanking } from '@/lib/booking'
export async function GET() {
  const ranking = await getPublicRanking(getCurrentMonthPrefix())
  return NextResponse.json(ranking)
}
