const s:Record<string,{bg:string;color:string}> = {
  low:{bg:'#EBF5FF',color:'#1677FF'}, mid:{bg:'#FFF3E0',color:'#FF7A00'}, high:{bg:'#FFEBEE',color:'#FF4D4F'},
  recommended:{bg:'#FFF3E0',color:'#FF7A00'}, default:{bg:'#F5F5F7',color:'#86868B'},
}
export default function Tag({type='default',children}:any) {
  const t = s[type]||s.default
  return <span className="inline-flex items-center rounded-full text-[12px] font-medium tracking-[-0.01em]" style={{height:24,padding:'0 10px',backgroundColor:t.bg,color:t.color,letterSpacing:'-0.01em'}}>{children}</span>
}
