'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getBeijingDateStr, isSunday } from '@/lib/time'

interface Props {
  date: string
  onChange: (d: string) => void
}

export default function Header({ date, onChange }: Props) {
  const [time, setTime] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    function u() {
      const n = new Date()
      setTime(n.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}))
      setDateStr(n.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',weekday:'short'}))
    }
    u(); const i = setInterval(u,1000); return ()=>clearInterval(i)
  },[])

  const d = new Date(date + 'T00:00:00+08:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['日','一','二','三','四','五','六']
  const wd = weekdays[d.getDay()]

  return (
    <div className="bg-white" style={{height:72}}>
      <div className="mx-auto flex items-center justify-between px-5 h-full" style={{maxWidth:390}}>
        {/* 左：时间 */}
        <div className="flex items-center gap-3">
          <div className="text-[28px] font-bold tracking-[-0.03em] text-[#1D1D1F] tabular-nums leading-none">{time||'--:--'}</div>
          <Link href="/cancel" className="text-[12px] text-[#86868B] tracking-[-0.01em] underline underline-offset-2 mt-1">
            取消预约
          </Link>
        </div>

        {/* 右：可选日期 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const prev = new Date(d)
              prev.setDate(prev.getDate() - 1)
              onChange(getBeijingDateStr(prev))
            }}
            className="text-[#C7C7CC] active:text-[#86868B] text-sm leading-none pb-[2px]"
          >
            ‹
          </button>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[20px] font-bold tracking-[-0.02em] text-[#1D1D1F]">
              {month}月{day}日
            </span>
            <span className="text-[13px] text-[#86868B] tracking-[-0.01em] mt-[1px]">
              周{wd}
            </span>
          </div>
          <button
            onClick={() => {
              const next = new Date(d)
              next.setDate(next.getDate() + 1)
              onChange(getBeijingDateStr(next))
            }}
            className="text-[#C7C7CC] active:text-[#86868B] text-sm leading-none pb-[2px]"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
