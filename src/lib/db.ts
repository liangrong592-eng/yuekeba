// Turso HTTP API 客户端
// 不需要 @libsql/client，避免原生模块依赖问题

const TURSO_DB_URL = process.env.DATABASE_URL || ''
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || ''

// Turso HTTP API endpoint：libsql:// → https://
function getHttpUrl() {
  // 本地开发用 SQLite（通过 next dev 的 Node.js 环境）
  if (!TURSO_DB_URL || TURSO_DB_URL.startsWith('file:')) {
    return null
  }
  return TURSO_DB_URL.replace('libsql://', 'https://')
}

// Turso HTTP API 查询
async function executeQuery(sql: string, args: unknown[] = []) {
  const httpUrl = getHttpUrl()
  if (!httpUrl) {
    // 本地开发：使用动态 import @libsql/client
    const { createClient } = await import('@libsql/client')
    const client = createClient({ url: TURSO_DB_URL || 'file:./dev.db' })
    const result = await client.execute({ sql, args })
    return result.rows
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
  
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Turso query failed: ${res.status} ${text}`)
  }
  
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

// 预约相关操作
export const db = {
  async getBookingsByDate(date: string) {
    const rows = await executeQuery('SELECT name, slot FROM Booking WHERE date = ? AND cancelled = 0 ORDER BY createdAt ASC', [date])
    const grouped: Record<string, { name: string }[]> = {}
    for (const row of rows) {
      const slot = (row as any).slot as string
      if (!grouped[slot]) grouped[slot] = []
      grouped[slot].push({ name: (row as any).name as string })
    }
    return grouped
  },

  async findBooking(name: string, date: string) {
    const rows = await executeQuery('SELECT id, name, confirmCode, date, slot, bookingNumber FROM Booking WHERE name = ? AND date = ? AND cancelled = 0 LIMIT 1', [name, date])
    return rows[0] || null
  },

  async findBookingsByName(name: string) {
    return executeQuery('SELECT id, name, confirmCode, date, slot, bookingNumber FROM Booking WHERE name = ? AND cancelled = 0 ORDER BY date ASC', [name])
  },

  async createBooking(name: string, date: string, slot: string, confirmCode: string, bookingNumber: string) {
    const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
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
    return rows[0] || null
  },

  async getBookingCount(date: string) {
    const rows = await executeQuery('SELECT COUNT(*) as count FROM Booking WHERE date = ?', [date])
    return Number((rows[0] as any)?.count || 0)
  },

  async getAdminBookings(filters: { date?: string; slot?: string; status?: string; search?: string }) {
    let sql = 'SELECT * FROM Booking WHERE 1=1'
    const args: unknown[] = []
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
    const args: unknown[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    const rows = await executeQuery(sql, args)
    return Number((rows[0] as any)?.count || 0)
  },

  async getCancelledCount(filters: { date?: string; slot?: string; search?: string }) {
    let sql = 'SELECT COUNT(*) as count FROM Booking WHERE cancelled = 1'
    const args: unknown[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    const rows = await executeQuery(sql, args)
    return Number((rows[0] as any)?.count || 0)
  },

  async getMonthlyRanking(monthPrefix: string, limit = 10, searchName?: string) {
    let sql = "SELECT name, COUNT(*) as count FROM Booking WHERE date LIKE ? AND cancelled = 0"
    const args: unknown[] = [`${monthPrefix}%`]
    if (searchName) { sql += ' AND name LIKE ?'; args.push(`%${searchName}%`) }
    sql += ' GROUP BY name ORDER BY count DESC'
    if (limit) sql += ` LIMIT ${limit}`
    return executeQuery(sql, args)
  },

  async getMonthlyTotal(monthPrefix: string) {
    const rows = await executeQuery("SELECT COUNT(*) as count FROM Booking WHERE date LIKE ? AND cancelled = 0", [`${monthPrefix}%`])
    return Number((rows[0] as any)?.count || 0)
  },
}

export default db
