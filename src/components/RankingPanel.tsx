'use client'
import { useState, useEffect } from 'react'
export default function RankingPanel() {
  const [data,setData]=useState<any>(null);const [expanded,setExpanded]=useState(false);const [loading,setLoading]=useState(true)
  useEffect(()=>{fetch('/api/ranking').then(r=>r.json()).then(d=>setData(d)).catch(()=>{}).finally(()=>setLoading(false))},[])
  if(loading||!data||!data.rankings?.length) return null
  const top=data.rankings.slice(0,10);const medals=['🥇','🥈','🥉','4','5','6','7','8','9','10']
  return (
    <div className="rounded-[16px] bg-white transition-all" style={{border:'1.5px solid #F5F5F7',boxShadow:'0 1px 3px rgba(0,0,0,0.03)',height:expanded?260:76,overflow:'hidden'}}>
      <div className="p-[18px]">
        <button onClick={()=>setExpanded(!expanded)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="text-sm">🏆</span><span className="text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">本月排行 TOP10</span></div>
          <span className={`text-xs text-[#C7C7CC] transition-transform ${expanded?'rotate-180':''}`}>▼</span>
        </button>
        {expanded && (
          <div className="mt-3 space-y-2">
            {top.map((e:any,i:number)=>(
              <div key={e.rank} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2"><span className="w-5 text-center text-xs">{medals[i]}</span><span className="text-[13px] text-[#86868B] tracking-[-0.01em]">{e.name}</span></div>
                <span className="text-[13px] font-semibold text-[#1D1D1F]">{e.count}<span className="text-[12px] text-[#C7C7CC] font-normal ml-0.5">次</span></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
