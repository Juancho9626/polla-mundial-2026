const AVATAR_COLORS = ['#003087','#4fc3f7','#e63946','#2ec27e','#a78bfa','#fb923c','#f472b6','#34d399','#60a5fa','#fbbf24']
const MEDALS = ['🥇','🥈','🥉']

export default function Leaderboard({ leaderboard, currentUser, scoringConfig }) {
  if (!leaderboard.length) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ fontSize:60 }}>👥</div>
      <h3 style={{ fontFamily:'var(--font-o)', fontSize:28, letterSpacing:2, marginTop:16, color:'var(--blue)', textTransform:'uppercase' }}>Aún no hay jugadores</h3>
      <p style={{ color:'var(--text2)', marginTop:8 }}>Ve a "Mis Picks" y únete al torneo</p>
    </div>
  )

  const top3 = leaderboard.slice(0, 3)
  const podiumOrder = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : [top3[0]]
  const podiumRanks = top3.length >= 2 ? [2,1,3] : [1]

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontFamily:'var(--font-o)', fontSize:32, fontWeight:700, letterSpacing:3, color:'var(--blue)', textTransform:'uppercase' }}>🏆 Tabla de Posiciones</h2>
        <p style={{ color:'var(--text2)', fontSize:14, marginTop:4 }}>Actualizada en tiempo real · {leaderboard.length} jugadores</p>
      </div>

      {/* Podium */}
      {leaderboard.length >= 2 && (
        <div style={{ display:'grid', gridTemplateColumns: leaderboard.length >= 3 ? '1fr 1.15fr 1fr' : '1fr 1fr', gap:12, marginBottom:20 }}>
          {podiumOrder.map((p, i) => {
            const rank = podiumRanks[i]
            const isFirst = rank === 1
            const heights = [168, 200, 148]
            return (
              <div key={p.id} style={{ background: isFirst ? 'linear-gradient(145deg,#fffae6,#fff4b8)' : 'var(--glass)', border: isFirst ? '2px solid var(--gold)' : '1px solid var(--border)', borderRadius:'var(--r)', padding:'22px 14px', textAlign:'center', minHeight:heights[i], display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center', boxShadow: isFirst ? '0 8px 32px rgba(255,215,0,0.3)' : 'var(--shadow)', transition:'transform 0.2s', cursor:'default' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
              >
                <div style={{ fontSize:30, marginBottom:8 }}>{MEDALS[rank-1]}</div>
                <div style={{ width:50, height:50, borderRadius:'50%', background: AVATAR_COLORS[(rank-1)%AVATAR_COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-c)', fontWeight:800, fontSize:20, color:'#fff', margin:'0 auto 8px', border: isFirst ? '3px solid var(--gold)' : '2px solid rgba(255,255,255,0.5)' }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:15, color: isFirst ? '#92400e' : 'var(--text)', marginBottom:4 }}>{p.name}</div>
                <div style={{ fontFamily:'var(--font-d)', fontSize:38, color: isFirst ? '#92400e' : 'var(--blue)', lineHeight:1 }}>{p.total}</div>
                <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:1 }}>puntos</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      <div style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'2px solid var(--border)' }}>
              {['#','Jugador','Pts','🎯 Exactos','✅ Ganador','🤝 Empate'].map(h => (
                <th key={h} style={{ padding:'12px 14px', textAlign: h==='#'||h==='Pts'?'center':'left', fontFamily:'var(--font-c)', fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', fontWeight:700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((p, idx) => {
              const isMe = currentUser?.id === p.id
              return (
                <tr key={p.id} style={{ borderBottom:'1px solid #f1f5f9', background: isMe ? 'rgba(255,215,0,0.06)' : 'transparent', transition:'background 0.2s' }}
                  onMouseEnter={e => { if(!isMe) e.currentTarget.style.background='#f8fafc' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isMe ? 'rgba(255,215,0,0.06)' : 'transparent' }}
                >
                  <td style={{ padding:'13px 14px', textAlign:'center', fontFamily:'var(--font-d)', fontSize: idx<3?20:15, color: idx<3?'var(--blue)':'var(--text3)' }}>{idx<3?MEDALS[idx]:idx+1}</td>
                  <td style={{ padding:'13px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background: AVATAR_COLORS[idx%AVATAR_COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-c)', fontWeight:800, fontSize:14, color:'#fff', flexShrink:0 }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
                          {p.name}
                          {isMe && <span style={{ fontSize:10, background:'var(--blue)', color:'var(--gold)', borderRadius:4, padding:'1px 5px', fontFamily:'var(--font-c)', letterSpacing:1 }}>TÚ</span>}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text3)' }}>{p.predCount} predicciones</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'13px 14px', textAlign:'center', fontFamily:'var(--font-d)', fontSize:24, color:'var(--blue)' }}>{p.total}</td>
                  <td style={{ padding:'13px 14px', textAlign:'center' }}><span style={{ background:'#dcfce7', color:'#16a34a', borderRadius:6, padding:'3px 10px', fontWeight:700, fontSize:13 }}>{p.exact}</span></td>
                  <td style={{ padding:'13px 14px', textAlign:'center' }}><span style={{ background:'#dbeafe', color:'#2563eb', borderRadius:6, padding:'3px 10px', fontWeight:700, fontSize:13 }}>{p.winners}</span></td>
                  <td style={{ padding:'13px 14px', textAlign:'center' }}><span style={{ background:'#fef9c3', color:'#ca8a04', borderRadius:6, padding:'3px 10px', fontWeight:700, fontSize:13 }}>{p.draws}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop:14, display:'flex', gap:14, flexWrap:'wrap' }}>
        {[
          { c:'#16a34a', l:`Marcador exacto = ${scoringConfig.exact_score_points} pts` },
          { c:'#2563eb', l:`Empate correcto = ${scoringConfig.correct_draw_points} pts` },
          { c:'#d97706', l:`Ganador correcto = ${scoringConfig.correct_winner_points} pts` },
          { c:'var(--text3)', l:`Sin acierto = ${scoringConfig.no_hit_points} pt` },
        ].map(item => (
          <div key={item.l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)' }}>
            <div style={{ width:9, height:9, borderRadius:'50%', background:item.c, flexShrink:0 }} />
            {item.l}
          </div>
        ))}
      </div>
    </div>
  )
}
