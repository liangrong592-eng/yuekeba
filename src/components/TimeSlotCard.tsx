'use client'
import Button from './ui/Button'
import Tag from './ui/Tag'

const periodLbl:Record<string,string>={morning:'早晨',noon:'中午',evening:'晚上'}
const equipLbl:Record<string,string>={low:'充足',mid:'正常',high:'紧张'}
const congesLbl:Record<string,string>={low:'低峰',mid:'适中',高峰:'高峰'}

// 左侧竖条颜色 — Apple Fitness 风格
const barColors: Record<string, string> = {
  morning: '#FF8A00',  // 暖橙
  noon: '#1677FF',     // 蓝色
  evening: '#7C5CFC',  // 紫色
}

export default function TimeSlotCard({slot,isBooked,onBook,onToggleExpand,expanded}:any) {
  const isRec = slot.isRecommended
  const btnVar = isBooked?'success':slot.isFull||!slot.isBookable?'disabled':isRec?'warning':'primary'
  const btnLbl = isBooked?'已预约':slot.isFull?'已满':!slot.isBookable?'不可约':'预约'

  return (
    <div className="rounded-[16px] bg-white overflow-hidden transition-all relative" style={{
      border:'1.5px solid '+(isRec?'#FF7A0020':'#F0F0F0'),
      boxShadow:'0 1px 3px rgba(0,0,0,0.03)',
      minHeight:116,
    }}>
      {/* 左侧 4px 彩色竖条 */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{backgroundColor: barColors[slot.period] || '#DDD'}} />

      <div className="p-[18px] pl-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div>
              <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">{slot.timeRange}</span>
              <span className="text-[13px] text-[#86868B] ml-2 tracking-[-0.01em]">{periodLbl[slot.period]}</span>
            </div>
            {isRec && <Tag type="recommended">推荐</Tag>}
          </div>
          <button onClick={onToggleExpand} className="text-[#C7C7CC] active:text-[#86868B] transition-colors">
            <span className={`inline-block transition-transform text-sm ${expanded?'rotate-180':''}`}>▼</span>
          </button>
        </div>

        {expanded && (
          <div className="mb-3">
            {slot.bookings?.length>0 ? (
              <div className="flex flex-wrap gap-1.5">
                {slot.bookings.map((b:any,i:number)=>(
                  <span key={i} className="px-2.5 py-1 text-xs text-[#86868B] bg-[#F5F5F7] rounded-full">{b.name}</span>
                ))}
              </div>
            ) : <span className="text-xs text-[#C7C7CC]">暂无预约</span>}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[13px] text-[#86868B] tracking-[-0.01em]">
            <span>{slot.peopleCount}/{slot.capacity}</span>
            <span>{equipLbl[slot.congestionLevel]}</span>
            <Tag type={slot.congestionLevel}>{congesLbl[slot.congestionLevel]}</Tag>
          </div>
          <Button variant={btnVar} onClick={onBook} disabled={slot.isFull||!slot.isBookable} style={{height:34,padding:'0 14px',fontSize:13,borderRadius:10}}>
            {btnLbl}
          </Button>
        </div>
      </div>
    </div>
  )
}
