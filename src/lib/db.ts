// 数据库层 - 本地用 sql.js，线上用 Turso HTTP API
const TURSO_DB_URL = process.env.DATABASE_URL || ''
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || ''

// 线上模式：使用 Turso HTTP API
function isTursoMode() {
  return TURSO_DB_URL.startsWith('libsql://')
}

async function tursoQuery(sql: string, args: (string | number)[] = []) {
  const httpUrl = TURSO_DB_URL.replace('libsql://', 'https://')
  const res = await fetch(`${httpUrl}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_AUTH_TOKEN}`, 'Content-Type': 'application/json' },
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
    row.forEach((val: any, i: number) => { if (cols[i]) obj[cols[i].name] = val.value })
    return obj
  })
}

// 本地模式：使用 sql.js (纯 JS SQLite)
let localDb: any = null
async function getLocalDb() {
  if (localDb) return localDb
  const initSqlJs = await import('sql.js')
  const SQL = await initSqlJs.default()
  
  // 尝试加载已有的 dev.db
  const fs = await import('fs')
  const path = await import('path')
  const dbPath = path.join(process.cwd(), 'dev.db')
  
  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      localDb = new SQL.Database(buffer)
    } else {
      localDb = new SQL.Database()
    }
  } catch {
    localDb = new SQL.Database()
  }
  
  // 初始化表
  localDb.run(`CREATE TABLE IF NOT EXISTS Booking (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, confirmCode TEXT NOT NULL,
    date TEXT NOT NULL, slot TEXT NOT NULL, bookingNumber TEXT NOT NULL UNIQUE,
    cancelled INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    cancelledAt TEXT
  )`)
  localDb.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_name_date ON Booking(name, date)`)
  localDb.run(`CREATE INDEX IF NOT EXISTS idx_booking_date ON Booking(date)`)
  
  return localDb
}

function localQuery(sql: string, args: (string | number)[] = []) {
  const db = localDb
  if (!db) throw new Error('Database not initialized')
  
  // 处理参数化查询
  let idx = 0
  const processedSql = sql.replace(/\?/g, () => {
    const val = args[idx++]
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
    if (val === null || val === undefined) return 'NULL'
    return String(val)
  })
  
  try {
    const result = db.exec(processedSql)
    if (!result || result.length === 0) return []
    
    const cols = result[0].columns
    const values = result[0].values
    return values.map((row: any[]) => {
      const obj: Record<string, unknown> = {}
      row.forEach((val: any, i: number) => { obj[cols[i]] = val })
      return obj
    })
  } catch (e: any) {
    console.error('[DB] Query error:', e.message, 'SQL:', processedSql.substring(0, 100))
    throw e
  }
}

// 保存本地数据库
async function saveLocalDb() {
  if (!localDb) return
  try {
    const fs = await import('fs')
    const path = await import('path')
    const data = localDb.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(path.join(process.cwd(), 'dev.db'), buffer)
  } catch {}
}

async function query(sql: string, args: (string | number)[] = []) {
  if (isTursoMode()) {
    return tursoQuery(sql, args)
  }
  const db = await getLocalDb()
  const result = localQuery(sql, args)
  await saveLocalDb()
  return result
}

function toObj(row: any): any { return row || null }

export const db = {
  async getBookingsByDate(date: string) {
    const rows = await query('SELECT name, slot FROM Booking WHERE date = ? AND cancelled = 0 ORDER BY createdAt ASC', [date])
    const grouped: Record<string, { name: string }[]> = {}
    for (const row of rows) {
      const r = row as any
      if (!grouped[r.slot]) grouped[r.slot] = []
      grouped[r.slot].push({ name: r.name })
    }
    return grouped
  },

  async findBooking(name: string, date: string) {
    const rows = await query('SELECT id, name, confirmCode, date, slot, bookingNumber FROM Booking WHERE name = ? AND date = ? AND cancelled = 0 LIMIT 1', [name, date])
    return toObj(rows[0])
  },

  async findBookingsByName(name: string) {
    return query('SELECT id, name, confirmCode, date, slot, bookingNumber FROM Booking WHERE name = ? AND cancelled = 0 ORDER BY date ASC', [name])
  },

  async createBooking(name: string, date: string, slot: string, confirmCode: string, bookingNumber: string) {
    const id = crypto.randomUUID()
    await query('INSERT INTO Booking (id, name, confirmCode, date, slot, bookingNumber, cancelled) VALUES (?, ?, ?, ?, ?, ?, 0)', [id, name, confirmCode, date, slot, bookingNumber])
    return { id, name, confirmCode, date, slot, bookingNumber }
  },

  async cancelBooking(id: string) {
    await query("UPDATE Booking SET cancelled = 1, cancelledAt = datetime('now') WHERE id = ?", [id])
  },

  async adminCancelBooking(id: string) {
    await query("UPDATE Booking SET cancelled = 1, cancelledAt = datetime('now') WHERE id = ?", [id])
  },

  async getBookingById(id: string) {
    const rows = await query('SELECT * FROM Booking WHERE id = ?', [id])
    return toObj(rows[0])
  },

  async getBookingCount(date: string) {
    const rows = await query('SELECT COUNT(*) as cnt FROM Booking WHERE date = ?', [date])
    return Number((rows[0] as any)?.cnt || 0)
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
    return query(sql, args)
  },

  async getActiveCount(filters: { date?: string; slot?: string; search?: string }) {
    let sql = 'SELECT COUNT(*) as cnt FROM Booking WHERE cancelled = 0'
    const args: (string | number)[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    const rows = await query(sql, args)
    return Number((rows[0] as any)?.cnt || 0)
  },

  async getCancelledCount(filters: { date?: string; slot?: string; search?: string }) {
    let sql = 'SELECT COUNT(*) as cnt FROM Booking WHERE cancelled = 1'
    const args: (string | number)[] = []
    if (filters.date) { sql += ' AND date = ?'; args.push(filters.date) }
    if (filters.slot) { sql += ' AND slot = ?'; args.push(filters.slot) }
    if (filters.search) { sql += ' AND name LIKE ?'; args.push(`%${filters.search}%`) }
    const rows = await query(sql, args)
    return Number((rows[0] as any)?.cnt || 0)
  },

  async getMonthlyRanking(monthPrefix: string, limit = 0, searchName?: string) {
    let sql = "SELECT name, COUNT(*) as cnt FROM Booking WHERE date LIKE ? AND cancelled = 0"
    const args: (string | number)[] = [`${monthPrefix}%`]
    if (searchName) { sql += ' AND name LIKE ?'; args.push(`%${searchName}%`) }
    sql += ' GROUP BY name ORDER BY cnt DESC'
    if (limit > 0) sql += ` LIMIT ${limit}`
    return query(sql, args)
  },

  async getMonthlyTotal(monthPrefix: string) {
    const rows = await query("SELECT COUNT(*) as cnt FROM Booking WHERE date LIKE ? AND cancelled = 0", [`${monthPrefix}%`])
    return Number((rows[0] as any)?.cnt || 0)
  },
}

export default db
