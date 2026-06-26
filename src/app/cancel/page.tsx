'use client'
import{useState}from'react'
import { getBeijingDateStr } from '@/lib/time'
import Header from '@/components/Header'
import{ToastProvider,useToast}from'@/components/Toast'
export default function Cancel(){
  const[date,setDate]=useState(getBeijingDateStr())
  const[n,sN]=useState('');const[l,sL]=useState(false);const[r,sR]=useState<any>(null);const{show}=useToast()
  async function h(){const t=n.trim();if(!t){show('请输入名字','error');return};sL(true)
    try{const i=await fetch('/api/bookings/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:t,confirmCode:'0000'})});const d=await i.json();sR(d)
      if(d.success){show('取消成功','success');sN('')}else{show(d.error||'取消失败','error')}
    }catch{sR({success:false,error:'网络错误'});show('网络错误','error')}
    finally{sL(false)}
  }
  return(<ToastProvider><Header date={date} onChange={setDate}/>
    <main className="mx-auto px-5 py-8" style={{maxWidth:390}}>
      <h1 className="text-[20px] font-bold tracking-[-0.03em] text-[#1D1D1F] mb-1">取消预约</h1>
      <p className="text-[14px] text-[#86868B] tracking-[-0.01em] mb-5">输入名字即可取消 · 确认码 0000</p>
      <input type="text" value={n} onChange={e=>sN(e.target.value)} placeholder="你的名字"
        className="w-full rounded-[14px] border px-4 py-3 text-[15px] outline-none mb-3" style={{borderColor:'#F5F5F7',backgroundColor:'#FAFAFA'}}
        onKeyDown={e=>e.key==='Enter'&&h()}/>
      {r&&!r.success&&<p className="text-[13px] text-[#FF4D4F] mb-2">{r.error}</p>}
      {r?.success&&<p className="text-[13px] text-[#52C41A] mb-2">{r.message}</p>}
      <button onClick={h} disabled={l} className="w-full rounded-[14px] py-3 text-[15px] font-semibold tracking-[-0.01em] text-white transition-all active:scale-[0.97]" style={{backgroundColor:'#FF4D4F',height:50}}>{l?'...':'确认取消'}</button>
      <div className="mt-5 text-center"><a href="/" className="text-[13px] text-[#86868B] tracking-[-0.01em]">← 返回</a></div>
    </main>
  </ToastProvider>)
}
