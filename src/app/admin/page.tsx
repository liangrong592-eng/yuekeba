'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.success) {
        sessionStorage.setItem('admin_token', data.token)
        router.push('/admin/bookings')
      } else {
        setError(data.error || '密码错误')
      }
    } catch {
      setError('验证失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-xl font-bold text-zinc-800">
          管理后台
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-500">
          请输入管理员密码
        </p>

        <div className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理员密码"
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? '验证中...' : '登录'}
          </button>
        </div>
      </div>
    </div>
  )
}
