

const TURSO_DB_URL = process.env.DATABASE_URL || ''
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || ''

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

let localDb: any = null
const WASM_PATH = require("path").join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')

const getLocalDbPath = () => require("path"); async function getLocalDb() {
  if (localDb) return localDb
  const initSqlJs = await import('sql.js')
  const SQL = await initSqlJs.default({
    locateFile: () => WASM_PATH
  })
  localDb = new SQL.Database()
  
  localDb.run(`CREATE TABLE IF NOT EXISTS Booking (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, confirmCode TEXT NOT NULL,
    date TEXT NOT NULL, slot TEXT NOT NULL, bookingNumber TEXT NOT NULL UNIQUE,
    cancelled INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelledAt TEXT
  )`)
  return localDb
}

function localQuery(sql: string, args: (string | number)[] = []) {
  if (!localDb) throw new Error('DB not initialized')
  let idx = 0
  const q = sql.replace(/\?/g, () => {
    const v = args[idx++]
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`
    return v === null || v === undefined ? 'NULL' : String(v)
  })
  const r = localDb.exec(q)
  if (!r || !r.length) return []
  const cols = r[0].columns
  return r[0].values.map((row: any[]) => {
    const obj: Record<string, unknown> = {}
    row.forEach((v: any, i: number) => obj[cols[i]] = v)
    return obj
  })
}

async function saveLocalDb() {
  if (!localDb) return
  try {
    const fs = await import('fs')
    const data = localDb.export()
    fs.writeFileSync(path.join(process.cwd(), 'dev.db'), Buffer.from(data))
  } catch {}
}

async function query(sql: string, args: (string | number)[] = []) {
  if (isTursoMode()) return tursoQuery(sql, args)
  await getLocalDb()
  const r = localQuery(sql, args)
  await saveLocalDb()
  return r
}

function toObj(r: any) { return r || null }

export const db = {
  async getBookingsByDate(date: string) {
    const rows = await query('SELECT name, slot FROM Booking WHERE date=? AND cancelled=0 ORDER BY createdAt ASC', [date])
    const g: Record<string, { name: string }[]> = {}
    for (const r of rows) {
      const s = (r as any).slot as string
      if (!g[s]) g[s] = []
      g[s].push({ name: (r as any).name })
    }
    return g
  },
  async findBooking(name: string, date: string) {
    return toObj((await query('SELECT id,name,confirmCode,date,slot,bookingNumber FROM Booking WHERE name=? AND date=? AND cancelled=0 LIMIT 1', [name, date]))[0])
  },
  async findBookingsByName(name: string) {
    return query('SELECT id,name,confirmCode,date,slot,bookingNumber FROM Booking WHERE name=? AND cancelled=0 ORDER BY date ASC', [name])
  },
  async createBooking(name: string, date: string, slot: string, code: string, num: string) {
    const id = 'b' + Date.now() + Math.random().toString(36).slice(2,6)
    await query('INSERT INTO Booking(id,name,confirmCode,date,slot,bookingNumber,cancelled) VALUES(?,?,?,?,?,?,0)', [id, name, code, date, slot, num])
    return { id, name, confirmCode: code, date, slot, bookingNumber: num }
  },
  async cancelBooking(id: string) { await query("UPDATE Booking SET cancelled=1, cancelledAt=CURRENT_TIMESTAMP WHERE id=?", [id]) },
  async adminCancelBooking(id: string) { await query("UPDATE Booking SET cancelled=1, cancelledAt=CURRENT_TIMESTAMP WHERE id=?", [id]) },
  async getBookingById(id: string) { return toObj((await query('SELECT * FROM Booking WHERE id=?', [id]))[0]) },
  async getBookingCount(date: string) { return Number((await query('SELECT COUNT(*) as c FROM Booking WHERE date=?', [date]))[0]?.c || 0) },
  async getAdminBookings(f: any) {
    let sql = 'SELECT * FROM Booking WHERE 1=1'; const a: any[] = []
    if (f.date) { sql += ' AND date=?'; a.push(f.date) }
    if (f.slot) { sql += ' AND slot=?'; a.push(f.slot) }
    if (f.status === 'active') sql += ' AND cancelled=0'
    else if (f.status === 'cancelled') sql += ' AND cancelled=1'
    if (f.search) { sql += ' AND name LIKE ?'; a.push(`%${f.search}%`) }
    sql += ' ORDER BY date DESC, createdAt DESC'
    return query(sql, a)
  },
  async getActiveCount(f?: any) { return Number((await query('SELECT COUNT(*) as c FROM Booking WHERE cancelled=0'))[0]?.c || 0) },
  async getCancelledCount(f?: any) { return Number((await query('SELECT COUNT(*) as c FROM Booking WHERE cancelled=1'))[0]?.c || 0) },
  async getMonthlyRanking(m: string, limit = 0, search?: string) {
    let sql = "SELECT name,COUNT(*) as c FROM Booking WHERE date LIKE ? AND cancelled=0"
    const a: any[] = [`${m}%`]
    if (search) { sql += ' AND name LIKE ?'; a.push(`%${search}%`) }
    sql += ' GROUP BY name ORDER BY c DESC'
    if (limit > 0) sql += ` LIMIT ${limit}`
    return query(sql, a)
  },
  async getMonthlyTotal(m: string) { return Number((await query("SELECT COUNT(*) as c FROM Booking WHERE date LIKE ? AND cancelled=0", [`${m}%`]))[0]?.c || 0) },
}
export default db
