import { useState, useEffect } from 'react'
import { supabase, ADMIN_EMAIL, ADMIN_PASSWORD, calcularPuntos, isMatchLocked, formatDateColombia } from '../lib/supabase.js'
import { calcularTablaGrupo, grupoCompleto } from '../lib/groupTable.js'

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
const flagUrl = (team, size='w80') => { const c = FLAG_CODES[team]; return c ? `https://flagcdn.com/${size}/${c}.png` : null }
const FlagImg = ({ team, size=36 }) => {
  const url = flagUrl(team)
  return url
    ? <img src={url} alt={team} style={{ width:size, height:Math.round(size*0.67), objectFit:'cover', borderRadius:3, boxShadow:'0 1px 4px rgba(0,0,0,0.2)', flexShrink:0 }} />
    : <span style={{ fontSize:24 }}>🏳️</span>
}

const AVATAR_COLORS = ['#003087','#4fc3f7','#e63946','#2ec27e','#a78bfa','#fb923c','#f472b6','#34d399']
const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function MyPicks({ currentUser, matches, predictions, groupOrderPicks, topScorerPicks, scoringConfig, onRefresh, notify, loginUser, participants }) {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [localPreds, setLocalPreds] = useState({})
  const [savingMatch, setSavingMatch] = useState({})
  const [topScorer, setTopScorer]   = useState('')
  const [activeSection, setActiveSection] = useState('matches')
  const [activeGroup, setActiveGroup] = useState('A')
  const [groupConfirm, setGroupConfirm] = useState(null) // { group, tabla }
  const [savingGroup, setSavingGroup] = useState(false)
  const showPass = email.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  useEffect(() => {
    if (!currentUser) return
    const init = {}
    predictions.filter(p => p.participant_id === currentUser.id).forEach(p => {
      init[p.match_id] = { home: p.predicted_home, away: p.predicted_away }
    })
    setLocalPreds(init)
    const ts = topScorerPicks.find(t => t.participant_id === currentUser.id)
    if (ts) setTopScorer(ts.player_name)
  }, [currentUser, predictions, topScorerPicks])

  async function handleLogin() {
    if (!email.trim()) return notify('Ingresa tu email', 'error')
    setLoading(true)
    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password !== ADMIN_PASSWORD) {
      setLoading(false); return notify('Contraseña incorrecta', 'error')
    }
    const { data } = await supabase.from('participants').select('*').eq('email', email.trim().toLowerCase()).single()
    setLoading(false)
    if (!data) return notify('Email no autorizado. Pídele al admin que te agregue.', 'error')
    loginUser(data)
  }

async function savePrediction(matchId) {
    const pred = localPreds[matchId]
    console.log('SAVE CLICK:', matchId, 'pred:', pred, 'user:', currentUser?.id)
    if (pred?.home === undefined || pred?.away === undefined) {
      console.log('EARLY EXIT: pred incomplete')
      return notify('Ingresa ambos marcadores', 'warning')
    }
    const match = matches.find(m => m.id === matchId)
    const isAdmin = currentUser.email === 'juancho9626@gmail.com'
    if (!isAdmin && isMatchLocked(match?.match_date)) {
      console.log('EARLY EXIT: locked')
      return notify('Este partido ya está bloqueado 🔒', 'warning')
    }
    if (match?.is_finished) {
      console.log('EARLY EXIT: finished')
      return notify('Este partido ya terminó', 'warning')
    }
    setSavingMatch(s => ({ ...s, [matchId]: true }))
    const payload = {
      participant_id: currentUser.id,
      match_id: matchId,
      predicted_home: parseInt(pred.home),
      predicted_away: parseInt(pred.away),
      is_locked: true
    }
    console.log('UPSERT PAYLOAD:', payload)
    const { data, error } = await supabase.from('predictions').upsert(payload, { onConflict: 'participant_id,match_id' }).select()
    console.log('UPSERT RESULT:', { data, error })
    setSavingMatch(s => ({ ...s, [matchId]: false }))
    if (error) {
      console.error('UPSERT ERROR:', error)
      notify('Error: ' + error.message, 'error')
      return
    }
    onRefresh()
    notify('✅ Predicción guardada')
  }

  // Calcular tabla de grupo y mostrar confirmación
  function calcularYConfirmar(group) {
    const groupMatches = matches.filter(m => m.group_name === group && m.stage === 'group')
    const teams = [...new Set([...groupMatches.map(m=>m.home_team), ...groupMatches.map(m=>m.away_team)])]

    if (!grupoCompleto(groupMatches, localPreds)) {
      return notify(`Completa todos los marcadores del Grupo ${group} primero`, 'warning')
    }

    const tabla = calcularTablaGrupo(teams, groupMatches, localPreds)
    setGroupConfirm({ group, tabla })
  }

  async function confirmarClasificados() {
    if (!groupConfirm) return
    setSavingGroup(true)
    const { group, tabla } = groupConfirm
    const existing = await supabase.from('group_order_picks').select('*')
      .eq('participant_id', currentUser.id).eq('group_name', group).single()

    const data = {
      participant_id: currentUser.id,
      group_name: group,
      first_place: tabla[0].team,
      second_place: tabla[1].team,
      third_place: tabla[2]?.team || '',
      fourth_place: tabla[3]?.team || '',
    }

    if (existing.data) {
      await supabase.from('group_order_picks').update({ ...data, updated_at: new Date().toISOString() }).eq('id', existing.data.id)
    } else {
      await supabase.from('group_order_picks').insert(data)
    }

    setSavingGroup(false)
    setGroupConfirm(null)
    onRefresh()
    notify(`✅ Clasificados del Grupo ${group} confirmados`)
  }

  const myPoints = predictions.filter(p => p.participant_id === currentUser?.id).reduce((acc, pred) => {
    const match = matches.find(m => m.id === pred.match_id)
    if (match?.is_finished && match.home_score !== null) {
      return acc + calcularPuntos(pred.predicted_home, pred.predicted_away, match.home_score, match.away_score, scoringConfig)
    }
    return acc
  }, 0)

  // LOGIN
  if (!currentUser) return (
    <div style={{ maxWidth:440, margin:'0 auto' }}>
      <div style={{ background:'linear-gradient(135deg,rgba(0,30,80,.95),rgba(0,15,50,.97))', border:'1px solid rgba(255,215,0,.25)', borderRadius:'var(--r)', padding:'40px 36px', textAlign:'center', boxShadow:'0 16px 48px rgba(0,48,135,.3)' }}>
        <span style={{ fontSize:56, display:'block', marginBottom:14, animation:'bounce 1.8s ease infinite' }}>⚽</span>
        <h3 style={{ fontFamily:'var(--font-o)', fontSize:28, fontWeight:700, letterSpacing:3, color:'var(--gold)', marginBottom:10, textTransform:'uppercase' }}>Mis Predicciones</h3>
        <p style={{ color:'rgba(255,255,255,.5)', fontSize:14, marginBottom:28, lineHeight:1.6 }}>Ingresa tu email para acceder.<br/>Solo participantes autorizados.</p>
        <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} type="email" placeholder="tucorreo@email.com"
          style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', padding:'13px 18px', borderRadius:12, fontSize:15, marginBottom:10, textAlign:'center', fontFamily:'var(--font-b)', outline:'none' }} />
        {showPass && (
          <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} type="password" placeholder="Contraseña admin"
            style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,215,0,.3)', color:'#fff', padding:'13px 18px', borderRadius:12, fontSize:15, marginBottom:10, textAlign:'center', fontFamily:'var(--font-b)', outline:'none' }} />
        )}
        <button onClick={handleLogin} disabled={loading} style={{ width:'100%', background:'linear-gradient(135deg,var(--gold),var(--gold2))', color:'#000', border:'none', borderRadius:12, padding:15, fontFamily:'var(--font-o)', fontWeight:700, fontSize:17, letterSpacing:2, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, textTransform:'uppercase' }}>
          {loading ? '...' : '⚽ ENTRAR AL TORNEO'}
        </button>
        <p style={{ marginTop:16, fontSize:11, color:'rgba(255,255,255,.25)' }}>Máximo 40 jugadores · Solo emails autorizados</p>
        {participants.filter(p=>!p.is_admin).length > 0 && (
          <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.1)' }}>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:10, fontFamily:'var(--font-c)', letterSpacing:1, textTransform:'uppercase' }}>{participants.filter(p=>!p.is_admin).length} jugadores registrados</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
              {participants.filter(p=>!p.is_admin).map((p,i) => (
                <div key={p.id} style={{ background:'rgba(255,255,255,.08)', borderRadius:20, padding:'3px 10px', fontSize:12, color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:AVATAR_COLORS[i%AVATAR_COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#fff' }}>{p.name[0]}</div>
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const groupMatches = matches.filter(m => m.stage === 'group')
  const finishedMatches = groupMatches.filter(m => m.is_finished)

  return (
    <div>
      {/* Modal de confirmación de clasificados */}
      {groupConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'white', borderRadius:'var(--r)', padding:28, maxWidth:420, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily:'var(--font-o)', fontSize:22, color:'var(--blue)', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
              🏆 Clasificados Grupo {groupConfirm.group}
            </h3>
            <p style={{ color:'var(--text2)', fontSize:13, marginBottom:20 }}>
              Según tus predicciones, estos son los resultados calculados. ¿Confirmas?
            </p>
            <div style={{ display:'grid', gap:8, marginBottom:20 }}>
              {groupConfirm.tabla.map((t, i) => (
                <div key={t.team} style={{
                  display:'grid', gridTemplateColumns:'32px 1fr repeat(5,36px) 40px',
                  gap:6, alignItems:'center', padding:'10px 14px',
                  background: i < 2 ? 'rgba(0,48,135,0.06)' : '#f8fafc',
                  border: i < 2 ? '1px solid rgba(0,48,135,0.2)' : '1px solid #e2e8f0',
                  borderRadius:8
                }}>
                  <span style={{ fontFamily:'var(--font-d)', fontSize:20, color: i < 2 ? 'var(--blue)' : 'var(--text3)', textAlign:'center' }}>{i+1}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <FlagImg team={t.team} size={24} />
                    <span style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, color:'var(--text)' }}>{t.team}</span>
                    {i < 2 && <span style={{ fontSize:10, background:'var(--blue)', color:'var(--gold)', borderRadius:3, padding:'1px 5px', fontFamily:'var(--font-c)', letterSpacing:1 }}>CLASIFICA</span>}
                  </div>
                  {[['PJ',t.pj],['PG',t.pg],['PE',t.pe],['DG',t.dg>0?'+'+t.dg:t.dg],['Pts',t.pts]].map(([lbl,val]) => (
                    <div key={lbl} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:1 }}>{lbl}</div>
                      <div style={{ fontFamily:'var(--font-d)', fontSize:16, color: lbl==='Pts' ? 'var(--blue)' : 'var(--text)', lineHeight:1.2 }}>{val}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setGroupConfirm(null)} style={{ flex:1, background:'#f1f5f9', color:'var(--text2)', border:'1px solid var(--border)', borderRadius:8, padding:12, fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, cursor:'pointer', letterSpacing:1 }}>
                CANCELAR
              </button>
              <button onClick={confirmarClasificados} disabled={savingGroup} style={{ flex:2, background:'linear-gradient(135deg,var(--blue),var(--blue-dark))', color:'var(--gold)', border:'none', borderRadius:8, padding:12, fontFamily:'var(--font-c)', fontWeight:700, fontSize:14, cursor:'pointer', letterSpacing:1, textTransform:'uppercase' }}>
                {savingGroup ? '...' : '✅ CONFIRMAR CLASIFICADOS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-o)', fontSize:32, fontWeight:700, letterSpacing:3, color:'var(--blue)', textTransform:'uppercase' }}>🎯 Mis Predicciones</h2>
          <p style={{ color:'var(--text2)', fontSize:14, marginTop:4 }}>Hola, <strong>{currentUser.name}</strong></p>
        </div>
        <div style={{ background:'linear-gradient(135deg,#fffae6,#fff4b8)', border:'2px solid var(--gold)', borderRadius:'var(--r)', padding:'14px 22px', textAlign:'center', boxShadow:'0 4px 20px rgba(255,215,0,.2)' }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:40, color:'#92400e', letterSpacing:2 }}>{myPoints}</div>
          <div style={{ fontSize:10, color:'#b45309', fontFamily:'var(--font-c)', letterSpacing:2, textTransform:'uppercase' }}>MIS PUNTOS</div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, background:'rgba(255,255,255,0.7)', border:'1px solid var(--border)', padding:5, borderRadius:'var(--r)', backdropFilter:'blur(8px)', overflowX:'auto' }}>
        {[
          { id:'matches',  label:'⚽ Mis Marcadores' },
          { id:'groups',   label:'📊 Clasificados' },
          { id:'scorer',   label:'👟 Goleador' },
          { id:'results',  label:'📋 Resultados' },
        ].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ flex:1, minWidth:110, padding:'9px 8px', background: activeSection===s.id ? 'linear-gradient(135deg,var(--blue),var(--blue-dark))' : 'transparent', color: activeSection===s.id ? 'var(--gold)' : 'var(--text2)', border:'none', borderRadius:8, fontFamily:'var(--font-c)', fontSize:13, fontWeight:700, letterSpacing:0.5, cursor:'pointer', transition:'all 0.2s', whiteSpace:'nowrap' }}>{s.label}</button>
        ))}
      </div>

      {/* ===== MIS MARCADORES ===== */}
      {activeSection === 'matches' && (
        <div>
          {/* Group selector */}
          <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
            {GROUPS.map(g => {
              const gMatches = groupMatches.filter(m => m.group_name === g)
              const filled = gMatches.filter(m => {
                const p = localPreds[m.id]
                return p?.home !== undefined && p?.away !== undefined && p.home !== '' && p.away !== ''
              }).length
              const isComplete = filled === gMatches.length && gMatches.length > 0
              return (
                <button key={g} onClick={() => setActiveGroup(g)} style={{
                  padding:'6px 12px', borderRadius:20,
                  background: activeGroup===g ? 'var(--blue)' : isComplete ? 'rgba(22,163,74,0.1)' : 'var(--glass)',
                  color: activeGroup===g ? 'var(--gold)' : isComplete ? '#16a34a' : 'var(--text2)',
                  border: `1px solid ${activeGroup===g ? 'var(--blue)' : isComplete ? '#86efac' : 'var(--border)'}`,
                  fontFamily:'var(--font-c)', fontSize:12, fontWeight:700, letterSpacing:1, cursor:'pointer', transition:'all 0.2s'
                }}>
                  G{g} {isComplete ? '✓' : `${filled}/${gMatches.length}`}
                </button>
              )
            })}
          </div>

          {/* Matches sorted by date */}
          <div style={{ marginBottom:8 }}>
            <div style={{ display:'grid', gap:8 }}>
              {[...groupMatches].sort((a,b) => new Date(a.match_date) - new Date(b.match_date)).map(match => {
                const locked = isMatchLocked(match.match_date)
                const finished = match.is_finished
                const local = localPreds[match.id] || {}
                const existing = predictions.find(p => p.participant_id === currentUser.id && p.match_id === match.id)
                const changed = existing && (parseInt(local.home) !== existing.predicted_home || parseInt(local.away) !== existing.predicted_away)
                const isSaved = !!existing
                const hUrl = flagUrl(match.home_team)
                const aUrl = flagUrl(match.away_team)
                const canEdit = !locked && !finished

                // Admin always sees all picks; others only see after lock/finish
                const isAdminUser = currentUser.email === 'juancho9626@gmail.com'
                const canSeePicks = locked || finished || isAdminUser
                const otherPreds = canSeePicks
                  ? predictions.filter(p => p.match_id === match.id && p.participant_id !== currentUser.id)
                  : []

                return (
                  <div key={match.id} style={{ background:'var(--glass)', border:`1px solid ${finished?'rgba(22,163,74,0.3)':locked?'rgba(220,38,38,0.3)':isSaved?'#93c5fd':'var(--border)'}`, borderRadius:'var(--r)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
                    {/* Match header */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr minmax(80px,110px) 1fr', gap:6, alignItems:'center', padding:'12px 10px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {hUrl && <img src={hUrl} alt={match.home_team} style={{ width:36, height:24, objectFit:'cover', borderRadius:3, boxShadow:'0 1px 4px rgba(0,0,0,0.2)', flexShrink:0 }} />}
                        <div>
                          <div style={{ fontFamily:'var(--font-o)', fontWeight:600, fontSize:'clamp(11px,3vw,14px)', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{match.home_team}</div>
                          <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--font-c)' }}>LOCAL</div>
                        </div>
                      </div>
                      <div style={{ textAlign:'center', minWidth:110 }}>
                        {finished
                          ? <div style={{ fontFamily:'var(--font-d)', fontSize:26, color:'#16a34a', letterSpacing:4 }}>{match.home_score}—{match.away_score}</div>
                          : <div style={{ fontFamily:'var(--font-d)', fontSize:18, color:'var(--text3)', letterSpacing:2 }}>VS</div>
                        }
                        <div style={{ fontSize:10, color: finished?'#16a34a' : locked?'#dc2626':'var(--text3)', fontFamily:'var(--font-c)', fontWeight: (locked||finished)?700:400 }}>
                          {finished ? '✅ FINALIZADO' : locked ? '🔒 CERRADO' : formatDateColombia(match.match_date)}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontFamily:'var(--font-o)', fontWeight:600, fontSize:'clamp(11px,3vw,14px)', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{match.away_team}</div>
                          <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--font-c)' }}>VISITANTE</div>
                        </div>
                        {aUrl && <img src={aUrl} alt={match.away_team} style={{ width:36, height:24, objectFit:'cover', borderRadius:3, boxShadow:'0 1px 4px rgba(0,0,0,0.2)', flexShrink:0 }} />}
                      </div>
                    </div>

                    {/* My prediction input */}
                    <div style={{ padding:'0 16px 14px', borderTop:'1px solid rgba(0,0,0,0.06)' }}>
                      {canEdit ? (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:10, flexWrap:'wrap' }}>
                          <input type="number" min="0" max="20" value={local.home??existing?.predicted_home??''} onChange={e=>setLocalPreds(p=>({...p,[match.id]:{...p[match.id],home:e.target.value}}))} placeholder="0" style={scoreInputStyle} />
                          <span style={{ fontFamily:'var(--font-d)', fontSize:20, color:'var(--text3)' }}>—</span>
                          <input type="number" min="0" max="20" value={local.away??existing?.predicted_away??''} onChange={e=>setLocalPreds(p=>({...p,[match.id]:{...p[match.id],away:e.target.value}}))} placeholder="0" style={scoreInputStyle} />
                          <button onClick={() => savePrediction(match.id)} disabled={savingMatch[match.id]} style={{ background: changed||!isSaved ? 'linear-gradient(135deg,var(--blue),var(--blue-dark))' : '#e2e8f0', color: changed||!isSaved ? 'var(--gold)' : 'var(--text3)', border:'none', borderRadius:8, padding:'10px 16px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:12, letterSpacing:1, cursor:'pointer', transition:'all 0.2s' }}>
                            {savingMatch[match.id] ? '...' : isSaved ? (changed ? 'ACTUALIZAR' : '✓ GUARDADO') : 'GUARDAR'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ marginTop:10, textAlign:'center' }}>
                          <span style={{ fontFamily:'var(--font-d)', fontSize:24, color:'var(--blue)', letterSpacing:4 }}>
                            {existing ? `${existing.predicted_home} — ${existing.predicted_away}` : '0 — 0'}
                          </span>
                          <span style={{ fontSize:11, color:'var(--text3)', marginLeft:8, fontFamily:'var(--font-c)' }}>
                            {existing ? 'tu predicción' : 'sin predicción'}
                          </span>
                        </div>
                      )}

                      {/* All picks visible when locked, finished, or admin */}
                      {(locked || finished || currentUser.email === 'juancho9626@gmail.com') && (
                        <div style={{ marginTop:12, paddingTop:10, borderTop:'1px dashed rgba(0,0,0,0.08)' }}>
                          <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
                            {currentUser.email === 'juancho9626@gmail.com' && !locked && !finished ? '👁️ Vista admin (todos los picks)' : locked ? '🔒 Picks de todos (partido bloqueado)' : '👁️ Picks de todos'}
                          </div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:5, maxHeight:200, overflowY:'auto' }}>
                            {/* My pick first */}
                            {existing && (
                              <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(0,48,135,0.08)', border:'1px solid rgba(0,48,135,0.2)', borderRadius:8, padding:'4px 10px', fontSize:13 }}>
                                <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'var(--gold)', fontWeight:800 }}>{currentUser.name[0]}</div>
                                <span style={{ fontFamily:'var(--font-c)', fontWeight:700, color:'var(--blue)', fontSize:12 }}>{currentUser.name}</span>
                                <span style={{ fontFamily:'var(--font-d)', fontSize:16, color:'var(--blue)', letterSpacing:2 }}>{existing.predicted_home}-{existing.predicted_away}</span>
                                {finished && <span style={{ fontSize:11, color: calcularPuntos(existing.predicted_home, existing.predicted_away, match.home_score, match.away_score, scoringConfig) > 0 ? '#16a34a' : '#dc2626', fontWeight:700 }}>
                                  +{calcularPuntos(existing.predicted_home, existing.predicted_away, match.home_score, match.away_score, scoringConfig)}pts
                                </span>}
                              </div>
                            )}
                            {/* Others */}
                            {otherPreds.map(pred => {
                              const player = participants.find(p => p.id === pred.participant_id)
                              if (!player) return null
                              const pts = finished ? calcularPuntos(pred.predicted_home, pred.predicted_away, match.home_score, match.away_score, scoringConfig) : null
                              return (
                                <div key={pred.id} style={{ display:'flex', alignItems:'center', gap:5, background:'#f8fafc', border:'1px solid var(--border)', borderRadius:8, padding:'4px 10px', fontSize:13 }}>
                                  <div style={{ width:18, height:18, borderRadius:'50%', background:AVATAR_COLORS[participants.indexOf(player)%AVATAR_COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', fontWeight:800 }}>{player.name[0]}</div>
                                  <span style={{ fontFamily:'var(--font-c)', fontWeight:600, color:'var(--text2)', fontSize:12 }}>{player.name}</span>
                                  <span style={{ fontFamily:'var(--font-d)', fontSize:16, color:'var(--text)', letterSpacing:2 }}>{pred.predicted_home}-{pred.predicted_away}</span>
                                  {pts !== null && <span style={{ fontSize:11, color: pts > 0 ? '#16a34a' : '#dc2626', fontWeight:700 }}>+{pts}pts</span>}
                                </div>
                              )
                            })}
                            {otherPreds.length === 0 && !existing && <span style={{ fontSize:12, color:'var(--text3)' }}>Nadie ha predicho este partido aún</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== CLASIFICADOS ===== */}
      {activeSection === 'groups' && (
        <div>
          <div style={{ background:'rgba(0,48,135,0.06)', border:'1px solid rgba(0,48,135,0.15)', borderRadius:'var(--r)', padding:'14px 18px', marginBottom:20 }}>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
              📊 <strong>Cómo funciona:</strong> Llena todos los marcadores de un grupo en "Mis Marcadores", luego vuelve aquí y haz clic en <strong>"Ver mis clasificados"</strong>. El sistema calcula automáticamente quién clasifica según tus predicciones usando los puntos FIFA (Victoria=3, Empate=1, Derrota=0).
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:14 }}>
            {GROUPS.map(group => {
              const gMatches = groupMatches.filter(m => m.group_name === group)
              const teams = [...new Set([...gMatches.map(m=>m.home_team), ...gMatches.map(m=>m.away_team)])]
              const isComplete = grupoCompleto(gMatches, localPreds)
              const savedPick = groupOrderPicks ? groupOrderPicks.find ? groupOrderPicks.find(g => g.participant_id === currentUser.id && g.group_name === group) : null : null

              return (
                <div key={group} style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'18px', boxShadow:'var(--shadow)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div style={{ fontFamily:'var(--font-o)', fontSize:16, fontWeight:700, color:'var(--blue)', letterSpacing:2, textTransform:'uppercase' }}>Grupo {group}</div>
                    {savedPick
                      ? <span style={{ fontSize:11, background:'#dcfce7', color:'#16a34a', borderRadius:4, padding:'2px 8px', fontFamily:'var(--font-c)', fontWeight:700 }}>✓ Confirmado</span>
                      : isComplete
                      ? <span style={{ fontSize:11, background:'#fef9c3', color:'#ca8a04', borderRadius:4, padding:'2px 8px', fontFamily:'var(--font-c)', fontWeight:700 }}>Listo para calcular</span>
                      : <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-c)' }}>{gMatches.filter(m=>{const p=localPreds[m.id];return p?.home!==undefined&&p?.home!==''}).length}/{gMatches.length} partidos</span>
                    }
                  </div>

                  {/* Show saved clasificados */}
                  {savedPick && (
                    <div style={{ marginBottom:12 }}>
                      {[savedPick.first_place, savedPick.second_place, savedPick.third_place, savedPick.fourth_place].map((team, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background: i<2?'rgba(0,48,135,0.06)':'#f8fafc', borderRadius:6, marginBottom:4, border: i<2?'1px solid rgba(0,48,135,0.15)':'1px solid #e2e8f0' }}>
                          <span style={{ fontFamily:'var(--font-d)', fontSize:16, color: i<2?'var(--blue)':'var(--text3)', width:16, textAlign:'center' }}>{i+1}</span>
                          <FlagImg team={team} size={22} />
                          <span style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, flex:1 }}>{team}</span>
                          {i<2 && <span style={{ fontSize:10, background:'var(--blue)', color:'var(--gold)', borderRadius:3, padding:'1px 5px', fontFamily:'var(--font-c)' }}>CLASIFICA</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => calcularYConfirmar(group)}
                    disabled={!isComplete}
                    style={{ width:'100%', background: isComplete ? 'linear-gradient(135deg,var(--blue),var(--blue-dark))' : '#e2e8f0', color: isComplete ? 'var(--gold)' : 'var(--text3)', border:'none', borderRadius:8, padding:'10px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, letterSpacing:1, cursor: isComplete?'pointer':'not-allowed', transition:'all 0.2s', opacity: isComplete?1:0.6 }}>
                    {savedPick ? '🔄 RECALCULAR' : isComplete ? '📊 VER MIS CLASIFICADOS' : 'Completa los marcadores primero'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== GOLEADOR ===== */}
      {activeSection === 'scorer' && (() => {
        const myPick = topScorerPicks.find(t => t.participant_id === currentUser.id)
        const isLocked = !!myPick
        return (
          <div style={{ maxWidth:440, margin:'0 auto' }}>
            <div style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'28px', boxShadow:'var(--shadow)', textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>👟</div>
              <h3 style={{ fontFamily:'var(--font-o)', fontSize:24, fontWeight:700, color:'var(--blue)', letterSpacing:2, marginBottom:8, textTransform:'uppercase' }}>Goleador del Mundial</h3>
              <p style={{ color:'var(--text2)', fontSize:14, marginBottom:20, lineHeight:1.6 }}>¿Quién será el goleador del torneo?<br/>Acierta y gana <strong>10 puntos</strong>.</p>
              <div style={{ background:'rgba(220,38,38,0.08)', border:'2px solid #dc2626', borderRadius:10, padding:'12px 16px', marginBottom:20, textAlign:'left', display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
                <div>
                  <p style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:12, color:'#dc2626', letterSpacing:1, textTransform:'uppercase', marginBottom:3 }}>¡Valida el nombre correcto!</p>
                  <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>Una vez guardado, tu elección queda <strong>definitiva y no podrá cambiarse</strong>.</p>
                </div>
              </div>
              {isLocked ? (
                <div>
                  <div style={{ background:'rgba(22,163,74,0.08)', border:'2px solid #16a34a', borderRadius:10, padding:'18px', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
                    <span style={{ fontSize:28 }}>🔒</span>
                    <div style={{ textAlign:'left' }}>
                      <p style={{ fontSize:11, fontFamily:'var(--font-c)', letterSpacing:2, color:'#16a34a', textTransform:'uppercase', marginBottom:4 }}>Tu pick — definitivo</p>
                      <p style={{ fontFamily:'var(--font-d)', fontSize:24, color:'var(--blue)', letterSpacing:2 }}>{myPick.player_name}</p>
                    </div>
                  </div>
                  <p style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:1 }}>¿Necesitas corregirlo? Contacta al administrador.</p>
                </div>
              ) : (
                <div>
                  <input
                    value={topScorer}
                    onChange={e => setTopScorer(e.target.value.toUpperCase())}
                    placeholder="NOMBRE DEL JUGADOR"
                    style={{ width:'100%', background:'#f8fafc', border:'2px solid var(--blue)', color:'var(--text)', padding:'13px 18px', borderRadius:12, fontSize:16, marginBottom:10, textAlign:'center', fontFamily:'var(--font-c)', fontWeight:700, letterSpacing:2, outline:'none', textTransform:'uppercase', boxSizing:'border-box' }}
                  />
                  {topScorer.trim().length > 0 && (
                    <div style={{ background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.4)', borderRadius:8, padding:'8px 14px', marginBottom:12, fontSize:13, color:'var(--text2)' }}>
                      📋 Se guardará como: <strong style={{ color:'var(--blue)', fontFamily:'var(--font-c)', letterSpacing:1 }}>{topScorer.trim()}</strong>
                    </div>
                  )}
                  <button
                    onClick={async () => {
                      if (!topScorer.trim()) return notify('Escribe el nombre del goleador', 'error')
                      const nombre = topScorer.trim().toUpperCase()
                      const ok = confirm(`⚠️ CONFIRMACIÓN FINAL\n\nTu goleador:\n"${nombre}"\n\nEsta elección quedará DEFINITIVA y no podrá cambiarse.\n¿El nombre es correcto?`)
                      if (!ok) return
                      await supabase.from('top_scorer_picks').insert({ participant_id: currentUser.id, player_name: nombre })
                      setTopScorer(nombre)
                      onRefresh()
                      notify('🔒 Goleador guardado y bloqueado')
                    }}
                    style={{ width:'100%', background:'linear-gradient(135deg,var(--gold),var(--gold2))', color:'#000', border:'none', borderRadius:12, padding:14, fontFamily:'var(--font-o)', fontWeight:700, fontSize:16, letterSpacing:2, cursor:'pointer', textTransform:'uppercase' }}>
                    🔒 GUARDAR DEFINITIVAMENTE
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ===== RESULTADOS ===== */}
      {activeSection === 'results' && (
        <div>
          <h3 style={{ fontFamily:'var(--font-o)', fontSize:20, color:'var(--blue)', letterSpacing:2, marginBottom:16, textTransform:'uppercase' }}>Partidos Finalizados</h3>
          {finishedMatches.length === 0
            ? <p style={{ color:'var(--text3)', textAlign:'center', padding:40 }}>Aún no hay partidos finalizados</p>
            : (
              <div style={{ display:'grid', gap:8 }}>
                {finishedMatches.map(match => {
                  const pred = predictions.find(p => p.participant_id === currentUser.id && p.match_id === match.id)
                  const pts = pred ? calcularPuntos(pred.predicted_home, pred.predicted_away, match.home_score, match.away_score, scoringConfig) : scoringConfig.no_hit_points
                  const ptsColor = pts === scoringConfig.exact_score_points ? '#16a34a' : pts === scoringConfig.correct_winner_points ? '#2563eb' : '#64748b'
                  const hUrl = flagUrl(match.home_team)
                  const aUrl = flagUrl(match.away_team)
                  return (
                    <div key={match.id} style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'12px 16px', display:'grid', gridTemplateColumns:'1fr auto 1fr auto', gap:12, alignItems:'center', boxShadow:'var(--shadow)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {hUrl && <img src={hUrl} alt={match.home_team} style={{ width:32, height:21, objectFit:'cover', borderRadius:3 }} />}
                        <span style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13 }}>{match.home_team}</span>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'var(--font-d)', fontSize:22, color:'#16a34a', letterSpacing:3 }}>{match.home_score}—{match.away_score}</div>
                        {pred ? <div style={{ fontSize:11, color:'var(--text3)' }}>Tu pred: {pred.predicted_home}-{pred.predicted_away}</div>
                               : <div style={{ fontSize:11, color:'#dc2626' }}>Sin predicción</div>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                        <span style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13 }}>{match.away_team}</span>
                        {aUrl && <img src={aUrl} alt={match.away_team} style={{ width:32, height:21, objectFit:'cover', borderRadius:3 }} />}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <span style={{ background: pts > 0 ? ptsColor+'20' : '#f1f5f9', color: ptsColor, borderRadius:6, padding:'4px 10px', fontFamily:'var(--font-d)', fontSize:20 }}>+{pts}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}

const scoreInputStyle = {
  width:54, textAlign:'center', background:'#f1f5f9', border:'1px solid #e2e8f0',
  color:'var(--text)', padding:'8px 4px', borderRadius:8,
  fontFamily:'var(--font-d)', fontSize:24, outline:'none'
}
