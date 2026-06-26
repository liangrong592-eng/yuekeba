import db from './db'
import { generateConfirmCode } from './time'

export async function generateBookingNumber(date: string): Promise<string> {
  const count = await db.getBookingCount(date)
  const seq = String(count + 1).padStart(3, '0')
  const mmdd = date.slice(5).replace('-', '')
  return `YK-${mmdd}-${seq}`
}

export async function createBooking(name: string, date: string, slot: string) {
  const confirmCode = generateConfirmCode()
  const bookingNumber = await generateBookingNumber(date)
  const booking = await db.createBooking(name, date, slot, confirmCode, bookingNumber)
  return { ...booking, confirmCode }
}

export async function cancelBooking(name: string, confirmCode: string) {
  const bookings = await db.findBookingsByName(name)
  if (bookings.length === 0) return { success: false as const, error: '未找到有效预约' }
  
  const matched = bookings.find((b: any) => b.confirmCode === confirmCode)
  if (!matched) return { success: false as const, error: '确认码错误' }
  
  await db.cancelBooking((matched as any).id)
  return { success: true as const }
}

export async function getBookingsByDate(date: string) {
  return db.getBookingsByDate(date)
}

export async function getPublicRanking(monthPrefix: string) {
  const rankings = await db.getMonthlyRanking(monthPrefix, 10)
  const totalBookings = await db.getMonthlyTotal(monthPrefix)
  return {
    month: monthPrefix,
    rankings: rankings.map((entry: any, index: number) => ({
      rank: index + 1,
      name: entry.name,
      count: Number(entry.count),
    })),
    totalBookings,
  }
}

export async function getAdminRanking(monthPrefix: string, searchName?: string) {
  const rankings = await db.getMonthlyRanking(monthPrefix, 0, searchName)
  const totalBookings = await db.getMonthlyTotal(monthPrefix)
  return {
    month: monthPrefix,
    rankings: rankings.map((entry: any, index: number) => ({
      rank: index + 1,
      name: entry.name,
      count: Number(entry.count),
    })),
    totalBookings,
  }
}
