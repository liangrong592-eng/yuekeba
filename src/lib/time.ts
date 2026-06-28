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

/**
 * 所有时间计算统一使用 UTC 时间戳（毫秒），
 * 不受服务器/浏览器时区影响。
 *
 * 核心原则：
 * - Date.now() 返回 UTC 时间戳
 * - 北京时间 = UTC 时间 + 8小时，所以北京时间的时间戳 = Date.now()
 *   （同一瞬间，全球时间戳相同）
 * - 获取"北京日期"（YYYY-MM-DD）需要加 8h 后取 UTC 日期
 * - 比较时间直接用时间戳比较，不需要时区转换
 */

/** 获取当前北京时间日期字符串 YYYY-MM-DD */
export function getBeijingDateStr(date?: Date): string {
  const ms = (date?.getTime() ?? Date.now()) + 8 * 60 * 60 * 1000
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 判断某天是否是周日 */
export function isSunday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0
}

/** 获取输入日期的月份前缀 YYYY-MM */
export function getMonthPrefix(dateStr: string): string {
  return dateStr.slice(0, 7)
}

/** 获取当前月份前缀 */
export function getCurrentMonthPrefix(): string {
  return getMonthPrefix(getBeijingDateStr())
}

/** 将北京时间日期和时分转换为 UTC 时间戳（用于比较） */
function beijingSlotUTC(date: string, hour: number, minute: number): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d, hour - 8, minute)
}

/** 判断某个时段是否可预约 */
export function isSlotBookable(date: string, slot: Slot): { bookable: boolean; reason: string | null } {
  if (isSunday(date)) {
    return { bookable: false, reason: '周日不可预约' }
  }

  const slotUTC = beijingSlotUTC(date, slot.startHour, slot.startMinute)
  const hoursUntilStart = (slotUTC - Date.now()) / (1000 * 60 * 60)

  if (hoursUntilStart < 12) {
    return { bookable: false, reason: '需提前12小时预约' }
  }

  return { bookable: true, reason: null }
}

/** 判断某个预约是否可以取消 */
export function canCancelBooking(date: string, slot: Slot): { cancellable: boolean; reason: string | null } {
  const slotUTC = beijingSlotUTC(date, slot.startHour, slot.startMinute)
  const hoursUntilStart = (slotUTC - Date.now()) / (1000 * 60 * 60)

  if (hoursUntilStart < 2) {
    return { cancellable: false, reason: '距离开课不足2小时，不可取消' }
  }

  return { cancellable: true, reason: null }
}

/** 生成4位确认码 */
export function generateConfirmCode(): string {
  return "0000"
}
