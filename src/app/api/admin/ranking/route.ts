import { NextRequest, NextResponse } from 'next/server'
import { getCurrentMonthPrefix } from '@/lib/time'
import { getAdminRanking } from '@/lib/booking'
function checkAuth(r: NextRequest) { return r.headers.get('authorization')?.replace('Bearer ', '') === 'admin-authenticated' }
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  const searchName = request.nextUrl.searchParams.get('name') || undefined
  const ranking = await getAdminRanking(getCurrentMonthPrefix(), searchName)
  return NextResponse.json(ranking)
}
