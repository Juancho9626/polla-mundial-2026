export default function Rules({ scoringConfig: sc }) {
  const rules = [
    { icon:'🎯', title:'Marcador Exacto', pts:`${sc.exact_score_points} PTS`, desc:'Acertaste el marcador preciso. Aplica tanto para victorias como empates. Ej: predijiste 2-1 y fue 2-1, o predijiste 1-1 y fue 1-1.', color:'#16a34a', bg:'#dcfce7', border:'#86efac' },
    { icon:'✅', title:'Ganador Correcto', pts:`${sc.correct_winner_points} PTS`, desc:'Acertaste quién ganó pero no el marcador exacto. Ej: predijiste 1-0 y fue 3-1.', color:'#2563eb', bg:'#dbeafe', border:'#93c5fd' },
    { icon:'🤝', title:'Empate Correcto', pts:`${sc.correct_winner_points} PTS`, desc:'Predijiste empate y el partido terminó en empate, pero no acertaste el marcador exacto. Ej: predijiste 0-0 y fue 2-2.', color:'#d97706', bg:'#fef9c3', border:'#fde047' },
    { icon:'😤', title:'Sin Acierto', pts:`${sc.no_hit_points} PT`, desc:'No acertaste el resultado. Se da 1 punto por participar y mantener la motivación.', color:'#64748b', bg:'#f1f5f9', border:'#e2e8f0' },
    { icon:'🔒', title:'Bloqueo Automático', pts:'LOCK', desc:'Las predicciones de cada partido se bloquean 30 minutos antes de su inicio. Solo ese partido específico.', color:'#dc2626', bg:'#fee2e2', border:'#fca5a5' },
    { icon:'👟', title:'Goleador del Mundial', pts:`${sc.top_scorer_points} PTS`, desc:'Predice quién será el goleador del torneo. Solo se llena una vez durante la fase de grupos.', color:'#7c3aed', bg:'#f3e8ff', border:'#c084fc' },
    { icon:'📊', title:'Orden del Grupo', pts:`${sc.group_order_points} PTS`, desc:'Acierta el orden completo de clasificación (1°, 2°, 3°, 4°). +1 pt por cada equipo clasificado correcto.', color:'#0891b2', bg:'#e0f2fe', border:'#7dd3fc' },
    { icon:'⬆️', title:'Equipo Clasificado', pts:`${sc.classified_team_points} PT`, desc:'Por cada equipo que aciertas que clasifica de grupos, independiente del orden.', color:'#059669', bg:'#d1fae5', border:'#6ee7b7' },
    { icon:'🏆', title:'Campeón del Mundial', pts:`${sc.champion_points} PTS`, desc:'Aciertas al campeón del torneo en la fase eliminatoria.', color:'#b45309', bg:'#fef3c7', border:'#fcd34d' },
    { icon:'🥈', title:'Subcampeón', pts:`${sc.runner_up_points} PTS`, desc:'Aciertas al equipo finalista que no ganará el torneo.', color:'#475569', bg:'#f1f5f9', border:'#cbd5e1' },
    { icon:'🥉', title:'Tercer Lugar', pts:`${sc.third_place_points} PTS`, desc:'Aciertas al equipo ganador del partido por el tercer puesto.', color:'#92400e', bg:'#fef3c7', border:'#fcd34d' },
  ]

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h2 style={{ fontFamily:'var(--font-o)', fontSize:32, fontWeight:700, letterSpacing:3, color:'var(--blue)', textTransform:'uppercase' }}>📋 Reglas del Juego</h2>
        <p style={{ color:'var(--text2)', fontSize:14, marginTop:4 }}>Todo lo que necesitas saber para ganar</p>
      </div>

      {/* Summary card */}
      <div style={{ background:'linear-gradient(135deg,rgba(0,30,80,.92),rgba(0,15,50,.95))', border:'1px solid rgba(255,215,0,.3)', borderRadius:'var(--r)', padding:'24px', marginBottom:20, boxShadow:'0 8px 32px rgba(0,48,135,.2)' }}>
        <h3 style={{ fontFamily:'var(--font-o)', fontSize:18, fontWeight:700, color:'var(--gold)', letterSpacing:3, marginBottom:16, textTransform:'uppercase' }}>⚡ Resumen de Puntos</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10 }}>
          {[
            { icon:'🎯', label:'Marcador exacto', val:sc.exact_score_points },
            { icon:'✅', label:'Ganador correcto', val:sc.correct_winner_points },
            { icon:'🤝', label:'Empate correcto', val:sc.correct_winner_points },
            { icon:'😤', label:'Sin acierto', val:sc.no_hit_points },
            { icon:'👟', label:'Goleador', val:sc.top_scorer_points },
            { icon:'📊', label:'Orden grupo', val:sc.group_order_points },
            { icon:'🏆', label:'Campeón', val:sc.champion_points },
            { icon:'🥈', label:'Subcampeón', val:sc.runner_up_points },
          ].map(item => (
            <div key={item.label} style={{ background:'rgba(255,255,255,.07)', borderRadius:10, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{item.icon}</div>
              <div style={{ fontFamily:'var(--font-d)', fontSize:28, color:'var(--gold)', lineHeight:1 }}>{item.val}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', fontFamily:'var(--font-c)', letterSpacing:1, textTransform:'uppercase', marginTop:3 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed rules */}
      <div style={{ display:'grid', gap:10 }}>
        {rules.map(rule => (
          <div key={rule.title} style={{ background:'var(--glass)', border:`1px solid ${rule.border}`, borderRadius:'var(--r)', padding:'16px 18px', display:'flex', gap:16, alignItems:'center', boxShadow:'var(--shadow)', transition:'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform='translateX(4px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateX(0)'}
          >
            <div style={{ width:58, height:58, borderRadius:14, background:rule.bg, border:`1px solid ${rule.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:24 }}>{rule.icon}</span>
              <span style={{ fontFamily:'var(--font-d)', fontSize:12, color:rule.color, lineHeight:1, marginTop:2 }}>{rule.pts}</span>
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:16, color:rule.color, marginBottom:4 }}>{rule.title}</div>
              <div style={{ color:'var(--text2)', fontSize:13, lineHeight:1.6 }}>{rule.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FIFA 2026 info */}
      <div style={{ marginTop:20, background:'linear-gradient(135deg,rgba(0,100,40,.08),rgba(0,48,135,.08))', border:'1px solid rgba(0,100,40,.2)', borderRadius:'var(--r)', padding:'22px' }}>
        <h3 style={{ fontFamily:'var(--font-o)', fontSize:18, color:'#16a34a', letterSpacing:2, marginBottom:14, textTransform:'uppercase' }}>🌎 FIFA World Cup 2026</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10 }}>
          {[
            { label:'Países sede', val:'🇺🇸 🇨🇦 🇲🇽', sub:'USA · Canadá · México' },
            { label:'Equipos', val:'48', sub:'selecciones' },
            { label:'Partidos', val:'104', sub:'encuentros' },
            { label:'Grupos', val:'12', sub:'grupos de 4' },
            { label:'Inicio', val:'11 Jun', sub:'2026' },
            { label:'Final', val:'19 Jul', sub:'MetLife Stadium' },
          ].map(info => (
            <div key={info.label} style={{ background:'var(--glass)', borderRadius:10, padding:'12px', textAlign:'center', border:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-d)', fontSize:20, color:'var(--blue)', lineHeight:1 }}>{info.val}</div>
              <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:1, textTransform:'uppercase', marginTop:4 }}>{info.label}</div>
              <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{info.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
