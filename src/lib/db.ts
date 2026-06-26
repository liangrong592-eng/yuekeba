const TURSO_DB_URL = process.env.DATABASE_URL || ''
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || ''

function getHttpUrl() {
  if (!TURSO_DB_URL || TURSO_DB_URL.startsWith('file:')) return null
  return TURSO_DB_URL.replace('libsql://', 'https://')
}

async function executeQuery(sql: string, args: (string | number)[] = []) {
  const httpUrl = getHttpUrl()
  if (!httpUrl) {
    const { createClient } = await import('@libsql/client')
    const client = createClient({ url: TURSO_DB_URL || 'file:./dev.db' })
    const result = await client.execute(sql, args)
    return result.rows as Record<string, unknown>[]
  }
  
  const res = await fetch(`${httpUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args: args.map(a => ({ type: typeof a === 'number' ? 'integer' : 'text', value: String(a) })) } },
        { type: 'close' },
      ],
    }),
  })
  
  if (!res.ok) throw new Error(`Turso query failed: ${res.status}`)
  
  const data = await res.json()
  const result = data.results?.[0]
  if (result?.type === 'error') throw new Error(`Turso error: ${result.error?.message}`)
  
  return (result?.response?.result?.rows || []).map((row: any[]) => {
    const cols = result.response.result.cols
    const obj: Record<string, unknown> = {}
    row.forEach((val: any, i: number) => {
      if (cols[i]) obj[cols[i].name] = val.value
    })
    return obj
  })
}

export const db = {
  async getBookingsByDate(date: string) {
    const rows = await executeQuery('SELECT name, slot FROM Booking WHERE date = ? AND cancelled = 0 ORDER BY createdAt ASC', [date])
    const grouped: Record<string, { name: string }[]> = {}
    for (const row of rows) {
      const r = row as any
      if (!grouped[r.slot]) grouped[r.slot] = []
      grouped[r.slot].push({ name: r.name })
    }
    return grouped
  },

  async findBooking(name: string, date: string) {
    const rows = await executeQuery('SELECT id, name, confirmCode, date, slot, bookingNumber FROM Booking WHERE name = ? AND date = ? AND cancelled = 0 LIMIT 1', [name, date])
    return (rows[0] as any) || null
  },

  async findBookingsByName(name: string) {
    return executeQuery('SELECT id, name, confirmCode, date, slot, bookingNumber FROM Booking WHERE name = ? AND cancelled = 0 ORDER BY date ASC', [name])
  },

  async createBooking(name: string, date: string, slot: string, confirmCode: string, bookingNumber: string) {
    const id = crypto.randomUUID()
    await executeQuery('INSERT INTO Booking (id, name, confirmCode, date, slot, bookingNumber, cancelled) VALUES (?, ?, ?, ?, ?, ?, 0)', [id, name, confirmCode, date, slot, bookingNumber])
    return { id, name, confirmCode, date, slot, bookingNumber }
  },

  async cancelBooking(id: string) {
    await executeQuery("UPDATE Booking SET cancelled = 1, cancelledAt = datetime('now') WHERE id = ?", [id])
  },

  async adminCancelBooking(id: string) {
    await executeQuery("UPDATE Booking SET cancelled = 1, cancelledAt = datetime('now') WHERE id = ?", [id])
  },

  async getBookingById(id: string) {
    const rows = await executeQuery('SELECT * FROM Booking WHERE id = ?', [id])
    return (rows[0] as any) || null
  },

  async getBookingCount(date: string) {
    const rows = await executeQuery('SELECT COUNT(*) as count FROM Booking WHERE date = ?', [date])
    return Number((rows[0] as any)?.count || 0)
  },

  async getAdminBookings(filters: { date?: string; slot?: string; status?: string; search?: string }) {
    let sql = 'SELECT * FROM Booking WHERE 1=1'
    const args: (string | number)[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.status === 'active') sql += ' AND cancelled = 0'
    else if (filters.status === 'cancelled') sql += ' AND cancelled = 1'
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    sql += ' ORDER BY date DESC, createdAt DESC'
    return executeQuery(sql, args)
  },

  async getActiveCount(filters: { date?: string; slot?: string; search?: string }) {
    let sql = 'SELECT COUNT(*) as count FROM Booking WHERE cancelled = 0'
    const args: (string | number)[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    const rows = await executeQuery(sql, args)
    return Number((rows[0] as any)?.count || 0)
  },

  async getCancelledCount(filters: { date?: string; slot?: string; search?: string }) {
    let sql = 'SELECT COUNT(*) as count FROM Booking WHERE cancelled = 1'
    const args: (string | number)[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    const rows = await executeQuery(sql, args)
    return Number((rows[0] as any)?.count || 0)
  },

  async getMonthlyRanking(monthPrefix: string, limit = 0, searchName?: string) {
    let sql = "SELECT name, COUNT(*) as count FROM Booking WHERE date LIKE ? AND cancelled = 0"
    const args: (string | number)[] = [`${monthPrefix}%`]
    if (searchName) { sql += ' AND name LIKE ?'; args.push(`%${searchName}%`) }
    sql += ' GROUP BY name ORDER BY count DESC'
    if (limit > 0) sql += ` LIMIT ${limit}`
    return executeQuery(sql, args)
  },

  async getMonthlyTotal(monthPrefix: string) {
    const rows = await executeQuery("SELECT COUNT(*) as count FROM Booking WHERE date LIKE ? AND cancelled = 0", [`${monthPrefix}%`])
    return Number((rows[0] as any)?.count || 0)
  },
}

export default db
