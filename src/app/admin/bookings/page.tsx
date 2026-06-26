'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Booking {
  id: string
  name: string
  confirmCode: string
  date: string
  slot: string
  bookingNumber: string
  cancelled: boolean
  createdAt: string
  cancelledAt: string | null
}

interface RankingEntry {
  rank: number
  name: string
  count: number
}

export default function AdminBookingsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({ totalActive: 0, totalCancelled: 0, total: 0 })
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [rankingTotal, setRankingTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterDate, setFilterDate] = useState('')
  const [filterSlot, setFilterSlot] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [searchName, setSearchName] = useState('')
  const [rankingSearch, setRankingSearch] = useState('')

  useEffect(() => {
    const t = sessionStorage.getItem('admin_token')
    if (!t) {
      router.push('/admin')
      return
    }
    setToken(t)
  }, [router])

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  })

  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)

    const params = new URLSearchParams()
    if (filterDate) params.set('date', filterDate)
    if (filterSlot) params.set('slot', filterSlot)
    if (filterStatus) params.set('status', filterStatus)
    if (searchName) params.set('search', searchName)

    try {
      const [bookingsRes, rankingRes] = await Promise.all([
        fetch(`/api/admin/bookings?${params}`, { headers: headers() as HeadersInit }),
        fetch(`/api/admin/ranking?${rankingSearch ? `name=${encodeURIComponent(rankingSearch)}` : ''}`, { headers: headers() as HeadersInit }),
      ])

      if (bookingsRes.status === 401) {
        sessionStorage.removeItem('admin_token')
        router.push('/admin')
        return
      }

      const bookingsData = await bookingsRes.json()
      setBookings(bookingsData.bookings)
      setStats(bookingsData.stats)

      const rankingData = await rankingRes.json()
      setRanking(rankingData.rankings)
      setRankingTotal(rankingData.totalBookings)
    } catch {
      console.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [token, filterDate, filterSlot, filterStatus, searchName, rankingSearch, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleCancel(id: string) {
    if (!confirm('确定要取消这个预约吗？')) return

    try {
      const res = await fetch('/api/admin/bookings/cancel', {
        method: 'POST',
        headers: headers() as HeadersInit,
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        loadData()
      }
    } catch {
      console.error('Failed to cancel')
    }
  }

  if (!token) return null

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-zinc-800">管理后台</h1>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_token')
              router.push('/admin')
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            退出
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* 统计概览 */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">有效预约</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{stats.totalActive}</div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">已取消</div>
            <div className="mt-1 text-2xl font-bold text-red-500">{stats.totalCancelled}</div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">当月总预约</div>
            <div className="mt-1 text-2xl font-bold text-amber-600">{rankingTotal}</div>
          </div>
        </div>

        {/* 排行榜 */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">当月全量排行</h2>
            <input
              type="text"
              value={rankingSearch}
              onChange={(e) => setRankingSearch(e.target.value)}
              placeholder="搜索名字..."
              className="w-40 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-amber-400"
            />
          </div>
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {ranking.length > 0 ? (
              ranking.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-50">
                  <span className="text-zinc-600">{entry.name}</span>
                  <span className="text-zinc-400">{entry.count} 次</span>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-sm text-zinc-400">暂无数据</div>
            )}
          </div>
        </div>

        {/* 筛选 */}
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none"
          />
          <select
            value={filterSlot}
            onChange={(e) => setFilterSlot(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none"
          >
            <option value="">全部时段</option>
            <option value="6:30-7:00">6:30-7:00</option>
            <option value="12:30-13:30">12:30-13:30</option>
            <option value="18:30-19:30">18:30-19:30</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none"
          >
            <option value="active">有效预约</option>
            <option value="cancelled">已取消</option>
            <option value="all">全部</option>
          </select>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="搜索名字..."
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-amber-400"
          />
        </div>

        {/* 预约列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs text-zinc-500">
                  <th className="px-4 py-3 font-medium">预约编号</th>
                  <th className="px-4 py-3 font-medium">名字</th>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">时段</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="border-b border-zinc-50 transition-colors hover:bg-zinc-50">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{b.bookingNumber}</td>
                      <td className="px-4 py-3 font-medium text-zinc-700">{b.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{b.date}</td>
                      <td className="px-4 py-3 text-zinc-600">{b.slot}</td>
                      <td className="px-4 py-3">
                        {b.cancelled ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500">已取消</span>
                        ) : (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600">有效</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {new Date(b.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        {!b.cancelled && (
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                          >
                            取消
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
