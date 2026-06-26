import { createClient } from '@libsql/client'

let client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (client) return client
  
  const url = process.env.DB_URL || 'file:./dev.db'
  
  client = createClient({ url })
  return client
}

// 预约相关操作
export const db = {
  async getBookingsByDate(date: string) {
    const c = getClient()
    const rows = await c.execute({
      sql: 'SELECT name, slot FROM Booking WHERE date = ? AND cancelled = 0 ORDER BY createdAt ASC',
      args: [date],
    })
    const grouped: Record<string, { name: string }[]> = {}
    for (const row of rows.rows) {
      const slot = row.slot as string
      if (!grouped[slot]) grouped[slot] = []
      grouped[slot].push({ name: row.name as string })
    }
    return grouped
  },

  async getBookingsByDateFull(date: string) {
    const c = getClient()
    const rows = await c.execute({
      sql: 'SELECT id, name, confirmCode, date, slot, bookingNumber, cancelled, createdAt FROM Booking WHERE date = ? AND cancelled = 0 ORDER BY createdAt ASC',
      args: [date],
    })
    return rows.rows
  },

  async createBooking(name: string, date: string, slot: string, confirmCode: string, bookingNumber: string) {
    const c = getClient()
    const id = crypto.randomUUID()
    await c.execute({
      sql: 'INSERT INTO Booking (id, name, confirmCode, date, slot, bookingNumber, cancelled) VALUES (?, ?, ?, ?, ?, ?, 0)',
      args: [id, name, confirmCode, date, slot, bookingNumber],
    })
    return { id, name, confirmCode, date, slot, bookingNumber }
  },

  async findBooking(name: string, date: string) {
    const c = getClient()
    const rows = await c.execute({
      sql: 'SELECT id, name, confirmCode, date, slot, bookingNumber, cancelled FROM Booking WHERE name = ? AND date = ? AND cancelled = 0 LIMIT 1',
      args: [name, date],
    })
    return rows.rows[0] || null
  },

  async findBookingsByName(name: string) {
    const c = getClient()
    const rows = await c.execute({
      sql: 'SELECT id, name, confirmCode, date, slot, bookingNumber, cancelled FROM Booking WHERE name = ? AND cancelled = 0 ORDER BY date ASC',
      args: [name],
    })
    return rows.rows
  },

  async cancelBooking(id: string) {
    const c = getClient()
    await c.execute({
      sql: "UPDATE Booking SET cancelled = 1, cancelledAt = datetime('now') WHERE id = ?",
      args: [id],
    })
  },

  async adminCancelBooking(id: string) {
    const c = getClient()
    await c.execute({
      sql: "UPDATE Booking SET cancelled = 1, cancelledAt = datetime('now') WHERE id = ?",
      args: [id],
    })
  },

  async getBookingById(id: string) {
    const c = getClient()
    const rows = await c.execute({
      sql: 'SELECT * FROM Booking WHERE id = ?',
      args: [id],
    })
    return rows.rows[0] || null
  },

  async getAdminBookings(filters: { date?: string; slot?: string; status?: string; search?: string }) {
    const c = getClient()
    let sql = 'SELECT * FROM Booking WHERE 1=1'
    const args: unknown[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.status === 'active') { sql += ' AND cancelled = 0' }
    else if (filters.status === 'cancelled') { sql += ' AND cancelled = 1' }
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    sql += ' ORDER BY date DESC, createdAt DESC'
    const rows = await c.execute({ sql, args })
    return rows.rows
  },

  async getActiveCount(filters: { date?: string; slot?: string; search?: string }) {
    const c = getClient()
    let sql = 'SELECT COUNT(*) as count FROM Booking WHERE cancelled = 0'
    const args: unknown[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    const row = await c.execute({ sql, args })
    return Number(row.rows[0]?.count || 0)
  },

  async getCancelledCount(filters: { date?: string; slot?: string; search?: string }) {
    const c = getClient()
    let sql = 'SELECT COUNT(*) as count FROM Booking WHERE cancelled = 1'
    const args: unknown[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    const row = await c.execute({ sql, args })
    return Number(row.rows[0]?.count || 0)
  },

  async getBookingCount(date: string) {
    const c = getClient()
    const row = await c.execute({
      sql: 'SELECT COUNT(*) as count FROM Booking WHERE date = ?',
      args: [date],
    })
    return Number(row.rows[0]?.count || 0)
  },

  async getMonthlyRanking(monthPrefix: string, limit = 10, searchName?: string) {
    const c = getClient()
    let sql = "SELECT name, COUNT(*) as count FROM Booking WHERE date LIKE ? AND cancelled = 0"
    const args: unknown[] = [`${monthPrefix}%`]
    if (searchName) { sql += ' AND name LIKE ?'; args.push(`%${searchName}%`) }
    sql += ' GROUP BY name ORDER BY count DESC'
    if (limit) { sql += ` LIMIT ${limit}` }
    const rows = await c.execute({ sql, args })
    return rows.rows
  },

  async getMonthlyTotal(monthPrefix: string) {
    const c = getClient()
    const row = await c.execute({
      sql: "SELECT COUNT(*) as count FROM Booking WHERE date LIKE ? AND cancelled = 0",
      args: [`${monthPrefix}%`],
    })
    return Number(row.rows[0]?.count || 0)
  },
}

export default db
