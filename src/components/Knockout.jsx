export default function Knockout({ currentUser, matches, bracketPicks, appConfig, scoringConfig, onRefresh, notify }) {
  const started = appConfig?.knockout_started

  if (!started) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ fontSize:70, marginBottom:16, animation:'float 4s ease-in-out infinite' }}>🔒</div>
      <h3 style={{ fontFamily:'var(--font-o)', fontSize:30, fontWeight:700, letterSpacing:3, color:'var(--blue)', textTransform:'uppercase', marginBottom:12 }}>Fase Eliminatoria</h3>
      <p style={{ color:'var(--text2)', fontSize:16, maxWidth:420, margin:'0 auto', lineHeight:1.7 }}>
        Esta sección se habilitará automáticamente cuando finalice la fase de grupos y el admin active la eliminatoria.
      </p>
      <div style={{ marginTop:28, display:'inline-flex', alignItems:'center', gap:10, background:'var(--glass)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 24px', boxShadow:'var(--shadow)' }}>
        <span style={{ fontSize:24 }}>⚽</span>
        <span style={{ fontFamily:'var(--font-c)', fontSize:14, color:'var(--text2)', letterSpacing:1 }}>Los 32 clasificados se cargarán automáticamente</span>
      </div>
      <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, maxWidth:700, margin:'20px auto 0' }}>
        {[
          { stage:'16avos de Final', matches:16, icon:'⚔️' },
          { stage:'Cuartos de Final', matches:8, icon:'🏟️' },
          { stage:'Semifinales', matches:4, icon:'🌟' },
          { stage:'Final', matches:1, icon:'🏆' },
        ].map(s => (
          <div key={s.stage} style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px', textAlign:'center', boxShadow:'var(--shadow)' }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:14, color:'var(--blue)' }}>{s.stage}</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{s.matches} partido{s.matches>1?'s':''}</div>
          </div>
        ))}
      </div>
    </div>
  )

  const knockoutMatches = matches.filter(m => m.stage !== 'group')

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-o)', fontSize:32, fontWeight:700, letterSpacing:3, color:'var(--blue)', textTransform:'uppercase', marginBottom:20 }}>🔥 Fase Eliminatoria</h2>
      {knockoutMatches.length === 0 ? (
        <p style={{ color:'var(--text3)', textAlign:'center', padding:40 }}>Los partidos se cargarán pronto</p>
      ) : (
        <div style={{ display:'grid', gap:10 }}>
          {knockoutMatches.map(m => (
            <div key={m.id} style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px 18px', display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:14, alignItems:'center', boxShadow:'var(--shadow)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:28 }}>{m.home_flag}</span>
                <span style={{ fontFamily:'var(--font-o)', fontWeight:600, fontSize:15, textTransform:'uppercase' }}>{m.home_team}</span>
              </div>
              <div style={{ textAlign:'center' }}>
                {m.is_finished ? (
                  <div style={{ fontFamily:'var(--font-d)', fontSize:30, color:'#16a34a', letterSpacing:4 }}>{m.home_score} — {m.away_score}</div>
                ) : (
                  <div style={{ fontFamily:'var(--font-d)', fontSize:22, color:'var(--text3)', letterSpacing:2 }}>VS</div>
                )}
                <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:1, marginTop:4, textTransform:'uppercase' }}>
                  {m.stage==='r16'?'16avos':m.stage==='quarter'?'Cuartos':m.stage==='semi'?'Semis':m.stage==='third'?'3er Puesto':'FINAL'}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end', flexDirection:'row-reverse' }}>
                <span style={{ fontSize:28 }}>{m.away_flag}</span>
                <span style={{ fontFamily:'var(--font-o)', fontWeight:600, fontSize:15, textTransform:'uppercase' }}>{m.away_team}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
