export default function Notification({ msg, type }) {
  const colors = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'var(--blue)' }
  return (
    <div style={{ position:'fixed', top:20, right:20, zIndex:1000, background:colors[type]||colors.success, color:'#fff', padding:'12px 20px', borderRadius:'var(--r)', fontWeight:600, fontSize:14, boxShadow:'0 8px 32px rgba(0,0,0,0.25)', animation:'fadeUp 0.3s ease', maxWidth:320 }}>
      {msg}
    </div>
  )
}
