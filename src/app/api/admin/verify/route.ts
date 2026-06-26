import { NextRequest, NextResponse } from 'next/server'
export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return NextResponse.json({ success: false, error: '管理员密码未设置' }, { status: 500 })
  if (password === adminPassword) return NextResponse.json({ success: true, token: 'admin-authenticated' })
  return NextResponse.json({ success: false, error: '密码错误' }, { status: 401 })
}
