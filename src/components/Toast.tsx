'use client'
import{useState,createContext,useContext,useCallback}from'react'
const TC=createContext<any>({show:()=>{}})
export function useToast(){return useContext(TC)}
export function ToastProvider({children}:any){
  const[t,setT]=useState<any[]>([])
  const s=useCallback((text:string,type='info')=>{const id=Date.now();setT(p=>[...p,{id,text,type}]);setTimeout(()=>setT(p=>p.filter(x=>x.id!==id)),2500)},[])
  return(<TC.Provider value={{show:s}}>{children}
    <div className="fixed top-16 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 pointer-events-none">
      {t.map((x:any)=><div key={x.id} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold tracking-[-0.01em] text-white shadow-lg backdrop-blur-xl" style={{backgroundColor:x.type==='success'?'#52C41A':x.type==='error'?'#FF4D4F':'rgba(29,29,31,0.9)'}}>{x.text}</div>)}
    </div>
  </TC.Provider>)
}
