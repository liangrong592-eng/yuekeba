'use client'
import { useState, useEffect, useCallback } from 'react'
import { getBeijingDateStr } from '@/lib/time'
import Header from '@/components/Header'
import RecommendedCard from '@/components/RecommendedCard'
import TimeSlotCard from '@/components/TimeSlotCard'
import RankingPanel from '@/components/RankingPanel'
import BookDialog from '@/components/BookDialog'
import { ToastProvider, useToast } from '@/components/Toast'

function Main() {
  const [date, setDate] = useState(getBeijingDateStr())
  const [slots,setSlots]=useState<any[]>([]);const[rec,setRec]=useState<any>(null)
  const[bookedId,setBookedId]=useState<string|null>(null);const[expandedId,setExpandedId]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const[showBook,setShowBook]=useState(false);const[pendingSlot,setPendingSlot]=useState<string|null>(null);const[pendingDate,setPendingDate]=useState<string|null>(null)
  const[bookLoading,setBookLoading]=useState(false)
  const{show}=useToast()

  const load=useCallback(async()=>{
    setLoading(true)
    try{const r=await fetch(`/api/available-slots?date=${encodeURIComponent(date)}`);if(r.ok){const d=await r.json();setRec(d.recommendedSlot);setSlots(d.slots||[])}}
    catch{}finally{setLoading(false)}
  },[date])

  useEffect(()=>{load()},[load])

  const getRecDate = useCallback(() => {
    if (!rec) return date
    if (rec._isTomorrow) {
      const d = new Date(date + 'T00:00:00+08:00')
      d.setDate(d.getDate() + 1)
      while (d.getDay() === 0) d.setDate(d.getDate() + 1)
      return getBeijingDateStr(d)
    }
    return date
  }, [rec, date])

  function openBook(slotId:string, bookDate?:string) {
    if(bookedId===slotId) return
    setPendingSlot(slotId)
    setPendingDate(bookDate||date)
    setShowBook(true)
  }

  async function confirmBook(name:string) {
    if(!pendingSlot||!pendingDate||bookLoading)return
    setBookLoading(true);setShowBook(false)
    try{
      const r=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,date:pendingDate,slot:pendingSlot})})
      const d=await r.json()
      if(d.success){setBookedId(pendingSlot);show('预约成功','success');load()}else{show(d.error||'预约失败','error')}
    }catch{show('网络错误','error')}
    finally{setBookLoading(false);setPendingSlot(null);setPendingDate(null)}
  }

  return (
    <div className="mx-auto min-h-screen bg-white" style={{maxWidth:390}}>
      <Header date={date} onChange={setDate} />
      <div className="px-5 pt-4">
        {rec&&<div className="mb-4">
          <RecommendedCard slot={rec} isBooked={bookedId===rec.slotId} onBook={()=>openBook(rec.slotId, getRecDate())}/>
        </div>}
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">全部时段</h2>
          <span className="text-[13px] text-[#86868B] tracking-[-0.01em]">每人每天仅可预约一个时段</span>
        </div>
        {loading?(
          <div className="flex justify-center py-12"><div className="w-5 h-5 rounded-full border-2 border-[#F5F5F7] border-t-[#1677FF] animate-spin"/></div>
        ):(
          <div className="flex flex-col gap-3">
            {slots.map((s:any)=>(
              <TimeSlotCard key={s.slotId} slot={s} isBooked={bookedId===s.slotId} onBook={()=>openBook(s.slotId)}
                onToggleExpand={()=>setExpandedId(expandedId===s.slotId?null:s.slotId)} expanded={expandedId===s.slotId}/>
            ))}
          </div>
        )}
        <div className="mt-4"><RankingPanel/></div>
      </div>
      {showBook&&<BookDialog onConfirm={confirmBook} onClose={()=>setShowBook(false)} loading={bookLoading}/>}
    </div>
  )
}

export default function HomePage() {
  return(<ToastProvider><Main/></ToastProvider>)
}
