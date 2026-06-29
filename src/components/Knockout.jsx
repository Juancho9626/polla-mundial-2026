import { useState, useEffect } from 'react'
import { supabase, calcularPuntos, isMatchLocked, formatDateColombia } from '../lib/supabase.js'

const FLAG_CODES = {
  'México':'mx','Sudáfrica':'za','Corea del Sur':'kr','República Checa':'cz',
  'Canadá':'ca','Bosnia y Herz.':'ba','Qatar':'qa','Suiza':'ch',
  'Bosnia y Herzegovina':'ba',
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
    : <span style={{ fontSize:Math.round(size*0.7) }}>🏳️</span>
}

const AVATAR_COLORS = ['#003087','#4fc3f7','#e63946','#2ec27e','#a78bfa','#fb923c','#f472b6','#34d399']

const STAGE_LABELS = {
  r16: '16avos de Final',
  quarter: 'Cuartos de Final',
  semi: 'Semifinales',
  third: 'Tercer Puesto',
  final: 'Gran Final',
}
const STAGE_ORDER = ['r16', 'quarter', 'semi', 'third', 'final']
const STAGE_ICONS = { r16:'⚔️', quarter:'🏟️', semi:'🌟', third:'🥉', final:'🏆' }

export default function Knockout({ currentUser, matches, predictions, bracketPicks, appConfig, scoringConfig, onRefresh, notify, loginUser, participants }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localPreds, setLocalPreds] = useState({})
  const [localPenalty, setLocalPenalty] = useState({})
  const [savingMatch, setSavingMatch] = useState({})
  const [activeStage, setActiveStage] = useState('r16')

  const ADMIN_EMAIL = 'juancho9626@gmail.com'
  const ADMIN_PASSWORD = 'Oigame*2026'
  const showPass = email.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  const started = appConfig?.knockout_started
  const knockoutMatches = matches.filter(m => m.stage !== 'group')

  // Init local predictions from saved predictions
  useEffect(() => {
    if (!currentUser) return
    const init = {}
    const initPenalty = {}
    predictions.filter(p => p.participant_id === currentUser.id).forEach(p => {
      init[p.match_id] = { home: p.predicted_home, away: p.predicted_away }
      if (p.predicted_penalty_winner) initPenalty[p.match_id] = p.predicted_penalty_winner
    })
    setLocalPreds(init)
    setLocalPenalty(initPenalty)
  }, [currentUser, predictions])

  // Auto-select first stage that has matches
  useEffect(() => {
    if (knockoutMatches.length > 0) {
      const firstStage = STAGE_ORDER.find(s => knockoutMatches.some(m => m.stage === s))
      if (firstStage) setActiveStage(firstStage)
    }
  }, [knockoutMatches.length])

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
    if (pred?.home === undefined || pred?.away === undefined || pred.home === '' || pred.away === '') {
      return notify('Ingresa ambos marcadores', 'warning')
    }
    const isDraw = parseInt(pred.home) === parseInt(pred.away)
    if (isDraw && !localPenalty[matchId]) {
      return notify('⚽ Hay empate — elige quién gana en penaltis', 'warning')
    }
    const match = matches.find(m => m.id === matchId)
    const isAdmin = currentUser.email === ADMIN_EMAIL
    if (!isAdmin && isMatchLocked(match?.match_date)) return notify('Este partido ya está bloqueado 🔒', 'warning')
    if (match?.is_finished) return notify('Este partido ya terminó', 'warning')
    setSavingMatch(s => ({ ...s, [matchId]: true }))
    const payload = {
      participant_id: currentUser.id,
      match_id: matchId,
      predicted_home: parseInt(pred.home),
      predicted_away: parseInt(pred.away),
      predicted_penalty_winner: isDraw ? localPenalty[matchId] : null,
      is_locked: true
    }
    const { error } = await supabase.from('predictions').upsert(payload, { onConflict: 'participant_id,match_id' })
    setSavingMatch(s => ({ ...s, [matchId]: false }))
    if (error) { notify('Error: ' + error.message, 'error'); return }
    onRefresh()
    notify('✅ Predicción guardada')
  }

  // ----- NOT STARTED -----
  if (!started) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ fontSize:70, marginBottom:16, animation:'float 4s ease-in-out infinite' }}>🔒</div>
      <h3 style={{ fontFamily:'var(--font-o)', fontSize:30, fontWeight:700, letterSpacing:3, color:'var(--blue)', textTransform:'uppercase', marginBottom:12 }}>Fase Eliminatoria</h3>
      <p style={{ color:'var(--text2)', fontSize:16, maxWidth:420, margin:'0 auto', lineHeight:1.7 }}>
        Esta sección se habilitará cuando el admin active la eliminatoria.
      </p>
    </div>
  )

  // ----- NO USER: login -----
  if (!currentUser) return (
    <div style={{ maxWidth:440, margin:'0 auto' }}>
      <div style={{ background:'linear-gradient(135deg,rgba(0,30,80,.95),rgba(0,15,50,.97))', border:'1px solid rgba(255,215,0,.25)', borderRadius:'var(--r)', padding:'40px 36px', textAlign:'center', boxShadow:'0 16px 48px rgba(0,48,135,.3)' }}>
        <span style={{ fontSize:56, display:'block', marginBottom:14, animation:'bounce 1.8s ease infinite' }}>🔥</span>
        <h3 style={{ fontFamily:'var(--font-o)', fontSize:28, fontWeight:700, letterSpacing:3, color:'var(--gold)', marginBottom:10, textTransform:'uppercase' }}>Fase Eliminatoria</h3>
        <p style={{ color:'rgba(255,255,255,.5)', fontSize:14, marginBottom:28, lineHeight:1.6 }}>Ingresa tu email para hacer tus predicciones.</p>
        <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} type="email" placeholder="tucorreo@email.com"
          style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', padding:'13px 18px', borderRadius:12, fontSize:15, marginBottom:10, textAlign:'center', fontFamily:'var(--font-b)', outline:'none', boxSizing:'border-box' }} />
        {showPass && (
          <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} type="password" placeholder="Contraseña admin"
            style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,215,0,.3)', color:'#fff', padding:'13px 18px', borderRadius:12, fontSize:15, marginBottom:10, textAlign:'center', fontFamily:'var(--font-b)', outline:'none', boxSizing:'border-box' }} />
        )}
        <button onClick={handleLogin} disabled={loading} style={{ width:'100%', background:'linear-gradient(135deg,var(--gold),var(--gold2))', color:'#000', border:'none', borderRadius:12, padding:15, fontFamily:'var(--font-o)', fontWeight:700, fontSize:17, letterSpacing:2, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, textTransform:'uppercase' }}>
          {loading ? '...' : '🔥 ENTRAR A LA ELIMINATORIA'}
        </button>
      </div>
    </div>
  )

  // ----- NO MATCHES YET -----
  if (knockoutMatches.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:60, marginBottom:16 }}>⏳</div>
      <h3 style={{ fontFamily:'var(--font-o)', fontSize:24, fontWeight:700, color:'var(--blue)', textTransform:'uppercase', marginBottom:8 }}>Cargando partidos...</h3>
      <p style={{ color:'var(--text2)', fontSize:14 }}>El admin está cargando los partidos de la eliminatoria.</p>
    </div>
  )

  const isAdminUser = currentUser.email === ADMIN_EMAIL
  const availableStages = STAGE_ORDER.filter(s => knockoutMatches.some(m => m.stage === s))
  const stageMatches = [...knockoutMatches.filter(m => m.stage === activeStage)].sort((a, b) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 86400000)
    const aDate = new Date(a.match_date)
    const bDate = new Date(b.match_date)
    const aIsToday = aDate >= today && aDate < tomorrow
    const bIsToday = bDate >= today && bDate < tomorrow
    if (aIsToday && !bIsToday) return -1
    if (!aIsToday && bIsToday) return 1
    if (!a.is_finished && b.is_finished) return -1
    if (a.is_finished && !b.is_finished) return 1
    return aDate - bDate
  })

  // Total knockout points
  const myKnockoutPoints = predictions
    .filter(p => p.participant_id === currentUser.id)
    .reduce((acc, pred) => {
      const match = matches.find(m => m.id === pred.match_id && m.stage !== 'group')
      if (match?.is_finished && match.home_score !== null) {
        return acc + calcularPuntos(pred.predicted_home, pred.predicted_away, match.home_score, match.away_score, scoringConfig)
      }
      return acc
    }, 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-o)', fontSize:32, fontWeight:700, letterSpacing:3, color:'var(--blue)', textTransform:'uppercase' }}>🔥 Fase Eliminatoria</h2>
          <p style={{ color:'var(--text2)', fontSize:14, marginTop:4 }}>Hola, <strong>{currentUser.name}</strong></p>
        </div>
        <div style={{ background:'linear-gradient(135deg,#fffae6,#fff4b8)', border:'2px solid var(--gold)', borderRadius:'var(--r)', padding:'14px 22px', textAlign:'center', boxShadow:'0 4px 20px rgba(255,215,0,.2)' }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:40, color:'#92400e', letterSpacing:2 }}>{myKnockoutPoints}</div>
          <div style={{ fontSize:10, color:'#b45309', fontFamily:'var(--font-c)', letterSpacing:2, textTransform:'uppercase' }}>PTS ELIM.</div>
        </div>
      </div>

      {/* Stage tabs */}
      <div style={{ display:'flex', gap:5, marginBottom:18, overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:4 }}>
        {availableStages.map(stage => {
          const stM = knockoutMatches.filter(m => m.stage === stage)
          const hasPending = stM.some(m => !m.is_finished)
          const allDone = stM.length > 0 && stM.every(m => m.is_finished)
          return (
            <button key={stage} onClick={() => setActiveStage(stage)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0,
              background: activeStage===stage ? 'linear-gradient(135deg,var(--blue),var(--blue-dark))' : 'var(--glass)',
              color: activeStage===stage ? 'var(--gold)' : 'var(--text2)',
              border: `1px solid ${activeStage===stage ? 'var(--blue)' : allDone ? '#86efac' : 'var(--border)'}`,
              fontFamily:'var(--font-c)', fontSize:12, fontWeight:700, letterSpacing:0.5, cursor:'pointer', transition:'all 0.2s'
            }}>
              <span>{STAGE_ICONS[stage]}</span>
              <span>{STAGE_LABELS[stage]}</span>
              {allDone ? <span style={{ fontSize:10 }}>✓</span> : hasPending ? <span style={{ fontSize:10, opacity:0.7 }}>{stM.filter(m=>!m.is_finished).length}</span> : null}
            </button>
          )
        })}
      </div>

      {/* Stage label */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <span style={{ fontSize:24 }}>{STAGE_ICONS[activeStage]}</span>
        <h3 style={{ fontFamily:'var(--font-o)', fontSize:20, fontWeight:700, color:'var(--blue)', letterSpacing:2, textTransform:'uppercase' }}>{STAGE_LABELS[activeStage]}</h3>
        <span style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--font-c)' }}>({stageMatches.length} partido{stageMatches.length!==1?'s':''})</span>
      </div>

      {/* Matches */}
      <div style={{ display:'grid', gap:10 }}>
        {stageMatches.map(match => {
          const locked = isMatchLocked(match.match_date)
          const finished = match.is_finished
          const local = localPreds[match.id] || {}
          const existing = predictions.find(p => p.participant_id === currentUser.id && p.match_id === match.id)
          const changed = existing && (parseInt(local.home) !== existing.predicted_home || parseInt(local.away) !== existing.predicted_away)
          const isSaved = !!existing
          const hUrl = flagUrl(match.home_team)
          const aUrl = flagUrl(match.away_team)
          const canEdit = !locked && !finished
          const canSeePicks = locked || finished || isAdminUser
          const otherPreds = canSeePicks
            ? predictions.filter(p => p.match_id === match.id && p.participant_id !== currentUser.id)
            : []
          // Winner for display
          const winner = finished && match.home_score !== null
            ? (match.home_score > match.away_score ? match.home_team : match.home_score < match.away_score ? match.away_team : null)
            : null
          const isPorDefinir = !match.home_team || match.home_team === 'Por definir'
          const isAwayPorDefinir = !match.away_team || match.away_team === 'Por definir'

          return (
            <div key={match.id} style={{
              background:'var(--glass)', borderRadius:'var(--r)', overflow:'hidden', boxShadow:'var(--shadow)',
              border:`1px solid ${finished?'rgba(22,163,74,0.3)':locked?'rgba(220,38,38,0.3)':isSaved?'#93c5fd':'var(--border)'}`
            }}>
              {/* Match row */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr minmax(90px,120px) 1fr', gap:6, alignItems:'center', padding:'14px 12px' }}>
                {/* Home */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {hUrl && !isPorDefinir && <img src={hUrl} alt={match.home_team} style={{ width:38, height:25, objectFit:'cover', borderRadius:3, boxShadow:'0 1px 4px rgba(0,0,0,0.2)', flexShrink:0 }} />}
                  {isPorDefinir && <span style={{ fontSize:24 }}>❓</span>}
                  <div>
                    <div style={{
                      fontFamily:'var(--font-o)', fontWeight:600, fontSize:'clamp(11px,3vw,14px)', textTransform:'uppercase',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      color: winner === match.home_team ? '#16a34a' : isPorDefinir ? 'var(--text3)' : 'var(--text)'
                    }}>
                      {isPorDefinir ? 'Por definir' : match.home_team}
                      {winner === match.home_team && ' 🏆'}
                    </div>
                    <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--font-c)' }}>LOCAL</div>
                  </div>
                </div>

                {/* Score / date */}
                <div style={{ textAlign:'center' }}>
                  {finished
                    ? <div style={{ fontFamily:'var(--font-d)', fontSize:28, color:'#16a34a', letterSpacing:4 }}>{match.home_score}—{match.away_score}</div>
                    : <div style={{ fontFamily:'var(--font-d)', fontSize:20, color:'var(--text3)', letterSpacing:2 }}>VS</div>
                  }
                  <div style={{ fontSize:10, color: finished?'#16a34a':locked?'#dc2626':'var(--text3)', fontFamily:'var(--font-c)', fontWeight:(locked||finished)?700:400 }}>
                    {finished ? '✅ FINALIZADO' : locked ? '🔒 CERRADO' : formatDateColombia(match.match_date)}
                  </div>
                </div>

                {/* Away */}
                <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{
                      fontFamily:'var(--font-o)', fontWeight:600, fontSize:'clamp(11px,3vw,14px)', textTransform:'uppercase',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      color: winner === match.away_team ? '#16a34a' : isAwayPorDefinir ? 'var(--text3)' : 'var(--text)'
                    }}>
                      {isAwayPorDefinir ? 'Por definir' : match.away_team}
                      {winner === match.away_team && ' 🏆'}
                    </div>
                    <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--font-c)' }}>VISITANTE</div>
                  </div>
                  {aUrl && !isAwayPorDefinir && <img src={aUrl} alt={match.away_team} style={{ width:38, height:25, objectFit:'cover', borderRadius:3, boxShadow:'0 1px 4px rgba(0,0,0,0.2)', flexShrink:0 }} />}
                  {isAwayPorDefinir && <span style={{ fontSize:24 }}>❓</span>}
                </div>
              </div>

              {/* Prediction input */}
              <div style={{ padding:'0 14px 14px', borderTop:'1px solid rgba(0,0,0,0.06)' }}>
                {isPorDefinir || isAwayPorDefinir ? (
                  <div style={{ marginTop:10, textAlign:'center', padding:'8px', background:'rgba(0,0,0,0.03)', borderRadius:8 }}>
                    <span style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--font-c)' }}>⏳ Esperando definición de equipos</span>
                  </div>
                ) : canEdit ? (
                  <div style={{ marginTop:10 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, flexWrap:'wrap' }}>
                      <input type="number" min="0" max="20" value={local.home??existing?.predicted_home??''} onChange={e=>setLocalPreds(p=>({...p,[match.id]:{...p[match.id],home:e.target.value}}))} placeholder="0" style={scoreInputStyle} />
                      <span style={{ fontFamily:'var(--font-d)', fontSize:20, color:'var(--text3)' }}>—</span>
                      <input type="number" min="0" max="20" value={local.away??existing?.predicted_away??''} onChange={e=>setLocalPreds(p=>({...p,[match.id]:{...p[match.id],away:e.target.value}}))} placeholder="0" style={scoreInputStyle} />
                      <button onClick={() => savePrediction(match.id)} disabled={savingMatch[match.id]} style={{
                        background: changed||!isSaved ? 'linear-gradient(135deg,var(--blue),var(--blue-dark))' : '#e2e8f0',
                        color: changed||!isSaved ? 'var(--gold)' : 'var(--text3)',
                        border:'none', borderRadius:8, padding:'10px 16px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:12, letterSpacing:1, cursor:'pointer', transition:'all 0.2s'
                      }}>
                        {savingMatch[match.id] ? '...' : isSaved ? (changed ? 'ACTUALIZAR' : '✓ GUARDADO') : 'GUARDAR'}
                      </button>
                    </div>
                    {/* Penaltis: aparece solo si hay empate */}
                    {(() => {
                      const h = parseInt(local.home ?? existing?.predicted_home ?? -1)
                      const a = parseInt(local.away ?? existing?.predicted_away ?? -1)
                      if (isNaN(h) || isNaN(a) || h !== a || h < 0) return null
                      const penWinner = localPenalty[match.id] || existing?.predicted_penalty_winner
                      return (
                        <div style={{ marginTop:10, background:'rgba(251,146,60,0.08)', border:'1px solid rgba(251,146,60,0.3)', borderRadius:10, padding:'10px 14px' }}>
                          <div style={{ fontSize:11, color:'#c2410c', fontFamily:'var(--font-c)', fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:8, textAlign:'center' }}>
                            🟡 Empate — ¿Quién gana en penaltis?
                          </div>
                          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                            {[match.home_team, match.away_team].map(team => (
                              <button key={team} onClick={() => setLocalPenalty(p => ({ ...p, [match.id]: team }))}
                                style={{
                                  flex:1, maxWidth:160, padding:'8px 10px', borderRadius:8, cursor:'pointer', transition:'all 0.2s',
                                  background: penWinner === team ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#f8fafc',
                                  border: penWinner === team ? '2px solid #ea580c' : '2px solid #e2e8f0',
                                  color: penWinner === team ? '#fff' : 'var(--text2)',
                                  fontFamily:'var(--font-c)', fontWeight:700, fontSize:12, letterSpacing:0.5
                                }}>
                                {penWinner === team ? '🏆 ' : ''}{team}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div style={{ marginTop:10, textAlign:'center' }}>
                    <span style={{ fontFamily:'var(--font-d)', fontSize:24, color:'var(--blue)', letterSpacing:4 }}>
                      {existing ? `${existing.predicted_home} — ${existing.predicted_away}` : '? — ?'}
                    </span>
                    {existing?.predicted_penalty_winner && (
                      <span style={{ display:'inline-block', marginLeft:8, fontSize:11, background:'rgba(251,146,60,0.12)', border:'1px solid rgba(251,146,60,0.3)', borderRadius:6, padding:'2px 8px', color:'#c2410c', fontFamily:'var(--font-c)', fontWeight:700 }}>
                        🟡 pen. {existing.predicted_penalty_winner}
                      </span>
                    )}
                    <span style={{ fontSize:11, color:'var(--text3)', marginLeft:8, fontFamily:'var(--font-c)' }}>
                      {existing ? 'tu predicción' : 'sin predicción'}
                    </span>
                    {finished && existing && (() => {
                      const pts = calcularPuntos(existing.predicted_home, existing.predicted_away, match.home_score, match.away_score, scoringConfig)
                      return (
                        <span style={{ marginLeft:10, fontFamily:'var(--font-d)', fontSize:18, color: pts === scoringConfig.exact_score_points ? '#16a34a' : pts === scoringConfig.correct_winner_points ? '#2563eb' : '#64748b', fontWeight:700 }}>
                          +{pts}pts
                        </span>
                      )
                    })()}
                  </div>
                )}

                {/* Other picks (visible when locked or finished) */}
                {canSeePicks && !isPorDefinir && !isAwayPorDefinir && (
                  <div style={{ marginTop:12, paddingTop:10, borderTop:'1px dashed rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
                      {isAdminUser && !locked && !finished ? '👁️ Vista admin' : locked ? '🔒 Picks (partido bloqueado)' : '👁️ Picks de todos'}
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5, maxHeight:200, overflowY:'auto' }}>
                      {existing && (
                        <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(0,48,135,0.08)', border:'1px solid rgba(0,48,135,0.2)', borderRadius:8, padding:'4px 10px', fontSize:13 }}>
                          <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'var(--gold)', fontWeight:800 }}>{currentUser.name[0]}</div>
                          <span style={{ fontFamily:'var(--font-c)', fontWeight:700, color:'var(--blue)', fontSize:12 }}>{currentUser.name}</span>
                          <span style={{ fontFamily:'var(--font-d)', fontSize:16, color:'var(--blue)', letterSpacing:2 }}>{existing.predicted_home}-{existing.predicted_away}</span>
                          {existing.predicted_penalty_winner && <span style={{ fontSize:10, color:'#c2410c', fontFamily:'var(--font-c)', fontWeight:700 }}>🟡{existing.predicted_penalty_winner}</span>}
                          {finished && <span style={{ fontSize:11, color: calcularPuntos(existing.predicted_home, existing.predicted_away, match.home_score, match.away_score, scoringConfig) > 0 ? '#16a34a' : '#dc2626', fontWeight:700 }}>
                            +{calcularPuntos(existing.predicted_home, existing.predicted_away, match.home_score, match.away_score, scoringConfig)}pts
                          </span>}
                        </div>
                      )}
                      {otherPreds.map(pred => {
                        const player = participants.find(p => p.id === pred.participant_id)
                        if (!player) return null
                        const pts = finished ? calcularPuntos(pred.predicted_home, pred.predicted_away, match.home_score, match.away_score, scoringConfig) : null
                        return (
                          <div key={pred.id} style={{ display:'flex', alignItems:'center', gap:5, background:'#f8fafc', border:'1px solid var(--border)', borderRadius:8, padding:'4px 10px', fontSize:13 }}>
                            <div style={{ width:18, height:18, borderRadius:'50%', background:AVATAR_COLORS[participants.indexOf(player)%AVATAR_COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', fontWeight:800 }}>{player.name[0]}</div>
                            <span style={{ fontFamily:'var(--font-c)', fontWeight:600, color:'var(--text2)', fontSize:12 }}>{player.name}</span>
                            <span style={{ fontFamily:'var(--font-d)', fontSize:16, color:'var(--text)', letterSpacing:2 }}>{pred.predicted_home}-{pred.predicted_away}</span>
                            {pred.predicted_penalty_winner && <span style={{ fontSize:10, color:'#c2410c', fontFamily:'var(--font-c)', fontWeight:700 }}>🟡{pred.predicted_penalty_winner}</span>}
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

      {/* Summary of all stages */}
      {knockoutMatches.length > 0 && (
        <div style={{ marginTop:28, background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'18px', boxShadow:'var(--shadow)' }}>
          <h4 style={{ fontFamily:'var(--font-c)', fontSize:12, letterSpacing:2, color:'var(--text3)', textTransform:'uppercase', marginBottom:12 }}>📊 Tu avance en la eliminatoria</h4>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8 }}>
            {availableStages.map(stage => {
              const stM = knockoutMatches.filter(m => m.stage === stage)
              const myPreds = stM.filter(m => predictions.some(p => p.participant_id === currentUser.id && p.match_id === m.id))
              const myPts = predictions
                .filter(p => p.participant_id === currentUser.id)
                .reduce((acc, pred) => {
                  const match = stM.find(m => m.id === pred.match_id)
                  if (match?.is_finished && match.home_score !== null) {
                    return acc + calcularPuntos(pred.predicted_home, pred.predicted_away, match.home_score, match.away_score, scoringConfig)
                  }
                  return acc
                }, 0)
              return (
                <div key={stage} onClick={() => setActiveStage(stage)} style={{ textAlign:'center', padding:'12px 8px', background: activeStage===stage?'rgba(0,48,135,0.08)':'transparent', borderRadius:10, border:`1px solid ${activeStage===stage?'rgba(0,48,135,0.2)':'transparent'}`, cursor:'pointer', transition:'all 0.2s' }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{STAGE_ICONS[stage]}</div>
                  <div style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:11, color:'var(--blue)', marginBottom:2 }}>{STAGE_LABELS[stage]}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{myPreds.length}/{stM.length} pred.</div>
                  {myPts > 0 && <div style={{ fontFamily:'var(--font-d)', fontSize:18, color:'#16a34a', marginTop:2 }}>+{myPts}</div>}
                </div>
              )
            })}
          </div>
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
