'use client'
import { useState } from 'react'

interface Props {
  onConfirm: (name: string) => void
  onClose: () => void
  loading?: boolean
}

export default function BookDialog({ onConfirm, onClose, loading }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请输入名字')
      return
    }
    onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-t-[20px] sm:rounded-[20px] px-5 pb-8 pt-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#1D1D1F] mb-1">确认预约</h3>
        <p className="text-[13px] text-[#86868B] tracking-[-0.01em] mb-4">输入名字完成预约</p>

        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          placeholder="你的名字"
          autoFocus
          className="w-full rounded-[14px] border px-4 py-3 text-[15px] outline-none transition-all"
          style={{ borderColor: error ? '#FF4D4F' : '#F0F0F0', backgroundColor: '#FAFAFA' }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        {error && <p className="text-[12px] text-[#FF4D4F] mt-1.5 ml-1">{error}</p>}

        <div className="flex gap-2.5 mt-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-[14px] py-3 text-[15px] font-medium text-[#86868B] transition-all active:bg-[#F5F5F7]"
            style={{ border: '1.5px solid #F0F0F0' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-[14px] py-3 text-[15px] font-semibold text-white transition-all active:scale-[0.97]"
            style={{ backgroundColor: loading ? '#A0A0A0' : '#1677FF' }}
          >
            {loading ? '提交中...' : '确认预约'}
          </button>
        </div>
      </div>
    </div>
  )
}
