'use client'
export default function Button({children,variant='primary',onClick,disabled,style}:any) {
  const bg = disabled ? '#F5F5F7' : variant === 'primary' ? '#1677FF' : variant === 'success' ? '#52C41A' : variant === 'warning' ? '#FF7A00' : variant === 'outline' ? 'transparent' : '#1677FF'
  const color = disabled ? '#C7C7CC' : variant === 'outline' ? '#1677FF' : '#FFFFFF'
  const border = variant === 'outline' ? '1.5px solid #1677FF' : 'none'
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-[14px] text-[15px] font-semibold tracking-[-0.01em] transition-all active:scale-[0.97] active:opacity-80"
      style={{height:50,padding:'0 20px',backgroundColor:bg,color:color,border,...style,boxShadow:disabled?'none':'0 1px 3px rgba(0,0,0,0.04)'}}>
      {children}
    </button>
  )
}
