export default function Header({ currentUser, onLogout, isAdmin, onGoToPicks }) {
  return (
    <header style={{ background:'linear-gradient(135deg,rgba(0,30,80,0.97),rgba(0,15,50,0.99))', borderBottom:'4px solid var(--gold)', position:'sticky', top:0, zIndex:200, boxShadow:'0 6px 40px rgba(0,0,0,0.35)', backdropFilter:'blur(20px)' }}>
      <div style={{ maxWidth:1060, margin:'0 auto', padding:'0 10px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64, gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {/* Trionda ball */}
          <div style={{ width:48, height:48, borderRadius:'50%', overflow:'hidden', flexShrink:0, boxShadow:'0 0 24px rgba(255,215,0,0.7)', animation:'glowBall 3s ease-in-out infinite alternate', border:'2px solid rgba(255,255,255,0.3)', background:'conic-gradient(#CE1126 0deg 120deg,#003087 120deg 240deg,#16a34a 240deg 360deg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            ⚽
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-o)', fontSize:'clamp(14px,3.5vw,22px)', fontWeight:700, letterSpacing:'clamp(1px,0.5vw,3px)', color:'var(--gold)', lineHeight:1, textTransform:'uppercase' }}>MUNDIAL EN LA OFICINA</div>
            <div style={{ fontFamily:'var(--font-c)', fontSize:'clamp(8px,1.8vw,10px)', color:'rgba(255,255,255,0.45)', letterSpacing:2, textTransform:'uppercase' }}>¿Quién sabe más de fútbol? · FIFA 2026</div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {currentUser ? (
            <>
              {isAdmin && <span style={{ background:'rgba(255,215,0,0.15)', border:'1px solid rgba(255,215,0,0.4)', borderRadius:4, padding:'2px 8px', fontSize:11, color:'var(--gold)', fontFamily:'var(--font-c)', letterSpacing:2, fontWeight:700 }}>ADMIN</span>}
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:22, padding:'6px 14px' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:currentUser.avatar_color||'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-c)', fontWeight:800, fontSize:13, color:'#fff' }}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize:14, fontWeight:600, color:'#fff' }}>{currentUser.name}</span>
              </div>
              <button onClick={onLogout} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.5)', padding:'6px 12px', borderRadius:8, fontSize:12, fontFamily:'var(--font-c)', letterSpacing:1, cursor:'pointer', transition:'all 0.2s' }}>SALIR</button>
            </>
          ) : (
            <button onClick={onGoToPicks} style={{ background:'rgba(255,215,0,0.12)', border:'1px solid rgba(255,215,0,0.35)', borderRadius:22, padding:'8px 18px', fontSize:13, color:'var(--gold)', fontFamily:'var(--font-c)', letterSpacing:1, cursor:'pointer', transition:'all 0.2s' }}>
              ← Ingresa en Mis Picks
            </button>
          )}
        </div>
      </div>
      <div style={{ display:'flex', height:5 }}>
        <div style={{ flex:2, background:'var(--gold)' }} />
        <div style={{ flex:2, background:'var(--blue)' }} />
        <div style={{ flex:2, background:'var(--red)' }} />
      </div>
    </header>
  )
}
