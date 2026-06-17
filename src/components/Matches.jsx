import { useState } from 'react'

const FLAG_CODES = {
  'México':'mx','Sudáfrica':'za','Corea del Sur':'kr','República Checa':'cz',
  'Canadá':'ca','Bosnia y Herz.':'ba','Qatar':'qa','Suiza':'ch',
  'Brasil':'br','Marruecos':'ma','Haití':'ht','Escocia':'gb-sct',
  'Estados Unidos':'us','Paraguay':'py','Australia':'au','Turquía':'tr',
  'Alemania':'de','Curazao':'cw','Costa de Marfil':'ci','Ecuador':'ec',
  'Países Bajos':'nl','Japón':'jp','Suecia':'se','Túnez':'tn',
  'Bélgica':'be','Egipto':'eg','Irán':'ir','Nueva Zelanda':'nz',
  'España':'es','Cabo Verde':'cv','Arabia Saudí':'sa','Uruguay':'uy',
  'Francia':'fr','Senegal':'sn','Irak':'iq','Noruega':'no',
  'Argentina':'ar','Argelia':'dz','Austria':'at','Jordania':'jo',
  'Portugal':'pt','RD Congo':'cd','Uzbekistán':'uz','Colombia':'co',
  'Inglaterra':'gb-eng','Croacia':'hr','Ghana':'gh','Panamá':'pa',
}

function flagUrl(team, size='w80') {
  const code = FLAG_CODES[team]
  return code ? `https://flagcdn.com/${size}/${code}.png` : null
}

export default function Matches({ matches, predictions, currentUser, formatDate, isLocked }) {
  const [filterGroup, setFilterGroup] = useState('all')
  const groups = [...new Set(matches.filter(m=>m.group_name).map(m=>m.group_name))].sort()
  const groupMatches = matches.filter(m => m.stage === 'group')
  const filtered = groupMatches.filter(m => filterGroup === 'all' || m.group_name === filterGroup)
  // Sort all matches by date
  const sorted = [...filtered].sort((a, b) => new Date(a.match_date) - new Date(b.match_date))

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontFamily:'var(--font-o)', fontSize:32, fontWeight:700, letterSpacing:3, color:'var(--blue)', textTransform:'uppercase' }}>⚽ Partidos</h2>
        <p style={{ color:'var(--text2)', fontSize:14, marginTop:4 }}>{groupMatches.length} partidos · {groupMatches.filter(m=>m.is_finished).length} finalizados</p>
      </div>
      <div style={{ display:'flex', gap:7, marginBottom:18, flexWrap:'wrap' }}>
        <button onClick={()=>setFilterGroup('all')} style={filterBtn(filterGroup==='all')}>Todos</button>
        {groups.map(g => <button key={g} onClick={()=>setFilterGroup(g)} style={filterBtn(filterGroup===g)}>Grupo {g}</button>)}
      </div>
      {/* Group by date */}
      {(() => {
        const byDate = {}
        sorted.forEach(m => {
          const d = m.match_date ? new Date(m.match_date).toLocaleDateString('es-CO', { timeZone:'America/Bogota', weekday:'long', day:'numeric', month:'long' }) : 'Por definir'
          if (!byDate[d]) byDate[d] = []
          byDate[d].push(m)
        })
        return Object.entries(byDate).map(([date, ms]) => (
          <div key={date} style={{ marginBottom:24 }}>
            <div style={{ fontFamily:'var(--font-c)', fontSize:13, letterSpacing:2, color:'var(--blue)', fontWeight:700, textTransform:'uppercase', marginBottom:10, paddingLeft:12, borderLeft:'3px solid var(--gold)', display:'flex', alignItems:'center', gap:8 }}>
              📅 {date}
              <span style={{ fontSize:11, color:'var(--text3)', fontWeight:400 }}>{ms.length} partido{ms.length>1?'s':''}</span>
            </div>
            <div style={{ display:'grid', gap:8 }}>
              {ms.map(match => <MatchCard key={match.id} match={match} formatDate={formatDate} isLocked={isLocked} currentUser={currentUser} predictions={predictions} />)}
            </div>
          </div>
        ))
      })()}
    </div>
  )
}

function MatchCard({ match, formatDate, isLocked, currentUser, predictions }) {
  const locked = isLocked(match.match_date)
  const finished = match.is_finished
  const hasScore = match.home_score !== null && match.away_score !== null
  const myPred = currentUser ? predictions.find(p => p.participant_id === currentUser.id && p.match_id === match.id) : null
  const borderColor = finished ? '#16a34a' : locked ? '#dc2626' : 'rgba(255,200,0,0.7)'
  const hUrl = flagUrl(match.home_team)
  const aUrl = flagUrl(match.away_team)
  const hUrlLg = flagUrl(match.home_team, 'w160')
  const aUrlLg = flagUrl(match.away_team, 'w160')

  return (
    <div style={{ borderRadius:'var(--r)', overflow:'hidden', boxShadow:'var(--shadow)', position:'relative', transition:'all 0.2s', border:'1px solid var(--border)', borderLeft:`4px solid ${borderColor}` }}
      onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
      onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
    >
      {/* Flag backgrounds */}
      <div style={{ position:'absolute', inset:0, zIndex:0, display:'grid', gridTemplateColumns:'1fr 1fr', pointerEvents:'none' }}>
        <div style={{ overflow:'hidden', WebkitMaskImage:'linear-gradient(90deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0) 100%)', maskImage:'linear-gradient(90deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0) 100%)' }}>
          {hUrlLg && <img src={hUrlLg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
        </div>
        <div style={{ overflow:'hidden', WebkitMaskImage:'linear-gradient(270deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0) 100%)', maskImage:'linear-gradient(270deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0) 100%)' }}>
          {aUrlLg && <img src={aUrlLg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
        </div>
      </div>
      <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.75)', zIndex:1 }} />

      <div style={{ position:'relative', zIndex:2, display:'grid', gridTemplateColumns:'1fr minmax(90px,120px) 1fr', gap:8, alignItems:'center', padding:'14px 12px' }}>
        {/* Home */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {hUrl ? <img src={hUrl} alt={match.home_team} style={{ width:'clamp(28px,6vw,42px)', height:'clamp(19px,4vw,28px)', objectFit:'cover', borderRadius:4, boxShadow:'0 2px 8px rgba(0,0,0,0.2)', flexShrink:0 }} /> : <span style={{ fontSize:24 }}>🏳️</span>}
          <div>
            <div style={{ fontFamily:'var(--font-o)', fontWeight:600, fontSize:14, color:'var(--text)', textTransform:'uppercase', letterSpacing:0.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{match.home_team}</div>
            <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:1, textTransform:'uppercase' }}>LOCAL · {match.venue||'Grupo '+match.group_name}</div>
          </div>
        </div>

        {/* Center */}
        <div style={{ textAlign:'center' }}>
          {hasScore
            ? <div style={{ fontFamily:'var(--font-d)', fontSize:'clamp(20px,4vw,32px)', letterSpacing:3, color:finished?'#16a34a':'var(--blue)', lineHeight:1 }}>{match.home_score}—{match.away_score}</div>
            : <div style={{ fontFamily:'var(--font-d)', fontSize:'clamp(16px,3.5vw,22px)', color:'var(--text3)', letterSpacing:2 }}>VS</div>
          }
          <div style={{ marginTop:5 }}>
            {finished ? <span style={{ background:'#dcfce7', color:'#16a34a', borderRadius:6, padding:'3px 8px', fontSize:10, fontFamily:'var(--font-c)', fontWeight:700 }}>✅ FINAL</span>
            : locked ? <span style={{ background:'#fee2e2', color:'#dc2626', borderRadius:6, padding:'3px 8px', fontSize:10, fontFamily:'var(--font-c)', fontWeight:700 }}>🔒 CERRADO</span>
            : <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-c)' }}>{formatDate(match.match_date)}</div>}
          </div>
          {myPred && !finished && <div style={{ marginTop:4, fontSize:11, color:'var(--blue)', fontFamily:'var(--font-c)', fontWeight:700 }}>Pick: {myPred.predicted_home}-{myPred.predicted_away}</div>}
        </div>

        {/* Away */}
        <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'flex-end' }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'var(--font-o)', fontWeight:600, fontSize:14, color:'var(--text)', textTransform:'uppercase', letterSpacing:0.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{match.away_team}</div>
            <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:1, textTransform:'uppercase' }}>VISITANTE</div>
          </div>
          {aUrl ? <img src={aUrl} alt={match.away_team} style={{ width:'clamp(28px,6vw,42px)', height:'clamp(19px,4vw,28px)', objectFit:'cover', borderRadius:4, boxShadow:'0 2px 8px rgba(0,0,0,0.2)', flexShrink:0 }} /> : <span style={{ fontSize:24 }}>🏳️</span>}
        </div>
      </div>
    </div>
  )
}

const filterBtn = (active) => ({
  background: active ? 'var(--blue)' : 'var(--glass)',
  color: active ? 'var(--gold)' : 'var(--text2)',
  border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
  borderRadius: 20, padding:'6px 14px',
  fontFamily:'var(--font-c)', fontSize:12, fontWeight:700, letterSpacing:1,
  cursor:'pointer', transition:'all 0.2s', backdropFilter:'blur(8px)'
})
