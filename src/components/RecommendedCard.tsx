'use client'
import Button from './ui/Button'
export default function RecommendedCard({slot,isBooked,onBook}:any) {
  if(!slot) return null
  const cg:Record<string,string>={low:'充足',mid:'适中',high:'紧张'}

  // 推荐卡标题：根据时段状态动态展示
  const title = slot._isTomorrow ? '明日最早可约' : '最近可约时段'
  const icon = slot._isTomorrow ? '⏰' : '🔥'
  const tagText = slot._isTomorrow ? '明日' : '今日'

  return (
    <div className="rounded-[20px] overflow-hidden" style={{background:'linear-gradient(135deg, #1D1D1F 0%, #2C2C2E 100%)',boxShadow:'0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'}}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span style={{fontSize:20}}>{icon}</span>
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-white/90">{title}</span>
          <span className="text-[11px] text-white/50 bg-white/10 rounded-full px-2 py-0.5">{tagText}</span>
        </div>
        <div className="text-[34px] font-bold tracking-[-0.03em] text-white mt-1 mb-4">{slot.timeRange}</div>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-[13px] text-white/60">人数 <span className="font-semibold text-white/90 ml-1">{slot.peopleCount}/{slot.capacity}</span></div>
          <div className="text-[13px] text-white/60">器械 <span className="font-semibold text-white/90 ml-1">{cg[slot.congestionLevel]}</span></div>
          <div className="text-[13px] text-white/60">教练 <span className="font-semibold text-white/90 ml-1">在场</span></div>
        </div>
        <Button variant={isBooked?'success':slot.isFull?'disabled':'warning'} onClick={onBook} disabled={slot.isFull} style={{width:'100%',height:52,borderRadius:14,fontSize:16}}>
          {isBooked ? '已预约 ✓' : slot.isFull ? '已满' : '一键预约'}
        </Button>
      </div>
    </div>
  )
}
