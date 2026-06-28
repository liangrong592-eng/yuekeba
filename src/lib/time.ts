export type Slot = {
  id: string
  label: string
  sublabel: string
  startHour: number
  startMinute: number
}

export const SLOTS: readonly Slot[] = [
  { id: '6:30-7:00',   label: '6:30 — 7:00',   sublabel: '早晨', startHour: 6,  startMinute: 30 },
  { id: '12:30-13:30', label: '12:30 — 13:30', sublabel: '中午', startHour: 12, startMinute: 30 },
  { id: '18:30-19:30', label: '18:30 — 19:30', sublabel: '晚上', startHour: 18, startMinute: 30 },
] as const

/** 获取当前北京时间 (Date 对象，时间已对齐到北京时间) */
export function getBeijingNow(): Date {
  const now = new Date()
  // 直接用 UTC 时间偏移 +8 小时计算，避免 toLocaleString 在不同环境下格式不一致
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  return new Date(utcMs + 8 * 60 * 60 * 1000)
}

/** 获取北京时间的日期字符串 YYYY-MM-DD */
export function getBeijingDateStr(date?: Date): string {
  const d = date ?? getBeijingNow()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 判断某天是否是周日 */
export function isSunday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00+08:00')
  return d.getDay() === 0
}

/** 获取输入日期的月份前缀 YYYY-MM */
export function getMonthPrefix(dateStr: string): string {
  return dateStr.slice(0, 7)
}

/** 获取当前月份前缀 */
export function getCurrentMonthPrefix(): string {
  return getMonthPrefix(getBeijingDateStr())
}

/** 判断某个时段是否可预约 */
export function isSlotBookable(date: string, slot: Slot): { bookable: boolean; reason: string | null } {
  const now = getBeijingNow()
  const slotStart = new Date(`${date}T${String(slot.startHour).padStart(2, '0')}:${String(slot.startMinute).padStart(2, '0')}:00+08:00`)

  if (isSunday(date)) {
    return { bookable: false, reason: '周日不可预约' }
  }

  const hoursUntilStart = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilStart < 12) {
    return { bookable: false, reason: '需提前12小时预约' }
  }

  return { bookable: true, reason: null }
}

/** 判断某个预约是否可以取消 */
export function canCancelBooking(date: string, slot: Slot): { cancellable: boolean; reason: string | null } {
  const now = getBeijingNow()
  const slotStart = new Date(`${date}T${String(slot.startHour).padStart(2, '0')}:${String(slot.startMinute).padStart(2, '0')}:00+08:00`)

  const hoursUntilStart = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilStart < 2) {
    return { cancellable: false, reason: '距离开课不足2小时，不可取消' }
  }

  return { cancellable: true, reason: null }
}

/** 生成4位确认码 */
export function generateConfirmCode(): string {
  return "0000"
}
