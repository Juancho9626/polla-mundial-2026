import { useState, useEffect, useCallback } from 'react'
import { supabase, ADMIN_EMAIL, ADMIN_PASSWORD, calcularPuntos, isMatchLocked, isMatchAlertActive, formatDateColombia } from './lib/supabase.js'
import Background from './components/Background.jsx'
import Header from './components/Header.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Matches from './components/Matches.jsx'
import MyPicks from './components/MyPicks.jsx'
import Knockout from './components/Knockout.jsx'
import Rules from './components/Rules.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import Notification from './components/Notification.jsx'


export default function App() {
  const [tab, setTab] = useState('leaderboard')
  const [participants, setParticipants] = useState([])
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState([])
  const [groupOrderPicks, setGroupOrderPicks] = useState([])
  const [topScorerPicks, setTopScorerPicks] = useState([])
  const [bracketPicks, setBracketPicks] = useState([])
  const [scoringConfig, setScoringConfig] = useState({
    exact_score_points: 5, correct_winner_points: 3, correct_draw_points: 2,
    no_hit_points: 1, top_scorer_points: 10, classified_team_points: 1,
    group_order_points: 5, champion_points: 5, runner_up_points: 3, third_place_points: 2,
    lock_minutes_before: 30, alert_minutes_before: 60
  })
  const [appConfig, setAppConfig] = useState({ phase: 'groups', knockout_started: false })
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    loadAll()
    const saved = localStorage.getItem('mundial2026_user')
    if (saved) {
      const u = JSON.parse(saved)
      setCurrentUser(u)
      setIsAdmin(u.email === ADMIN_EMAIL)
    }
  }, [])

  // Real-time subscriptions
  useEffect(() => {
    const subs = [
      supabase.channel('rt-matches').on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadMatches).subscribe(),
      supabase.channel('rt-predictions').on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, loadPredictions).subscribe(),
      supabase.channel('rt-participants').on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, loadParticipants).subscribe(),
      supabase.channel('rt-bracket').on('postgres_changes', { event: '*', schema: 'public', table: 'bracket_picks' }, loadBracket).subscribe(),
      supabase.channel('rt-scorer').on('postgres_changes', { event: '*', schema: 'public', table: 'top_scorer_picks' }, loadTopScorer).subscribe(),
      supabase.channel('rt-group-order').on('postgres_changes', { event: '*', schema: 'public', table: 'group_order_picks' }, loadGroupOrder).subscribe(),
    ]
    return () => subs.forEach(s => supabase.removeChannel(s))
  }, [])

  // Check alerts every minute
  useEffect(() => {
    const checkAlerts = () => {
      const upcoming = matches.filter(m => !m.is_finished && isMatchAlertActive(m.match_date))
      setAlerts(upcoming)
    }
    checkAlerts()
    const interval = setInterval(checkAlerts, 60000)
    return () => clearInterval(interval)
  }, [matches])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadParticipants(), loadMatches(), loadPredictions(), loadConfig(), loadGroupOrder(), loadTopScorer(), loadBracket()])
    setLoading(false)
  }

  async function loadParticipants() {
    const { data } = await supabase.from('participants').select('*').order('created_at')
    if (data) setParticipants(data)
  }
  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').order('match_date')
    if (data) setMatches(data)
  }
  async function loadPredictions() {
    const { data } = await supabase.from('predictions').select('*').limit(10000)
    if (data) setPredictions(data)
  }
  async function loadGroupOrder() {
    const { data } = await supabase.from('group_order_picks').select('*')
    if (data) setGroupOrderPicks(data)
  }
  async function loadTopScorer() {
    const { data } = await supabase.from('top_scorer_picks').select('*')
    if (data) setTopScorerPicks(data)
  }
  async function loadBracket() {
    const { data } = await supabase.from('bracket_picks').select('*')
    if (data) setBracketPicks(data)
  }
  async function loadConfig() {
    const { data: sc } = await supabase.from('scoring_config').select('*').single()
    if (sc) setScoringConfig(sc)
    const { data: ac } = await supabase.from('app_config').select('*').single()
    if (ac) setAppConfig(ac)
  }

  // Compute leaderboard
  const leaderboard = participants.filter(p => !p.is_admin).map(p => {
    let total = 0, exact = 0, winners = 0, draws = 0

    // Match predictions
    predictions.filter(pr => pr.participant_id === p.id).forEach(pred => {
      const match = matches.find(m => m.id === pred.match_id)
      if (match?.is_finished && match.home_score !== null) {
        const pts = calcularPuntos(pred.predicted_home, pred.predicted_away, match.home_score, match.away_score, scoringConfig)
        total += pts
        if (pts === scoringConfig.exact_score_points) exact++
        else if (pts === scoringConfig.correct_winner_points) winners++
        else if (pts === scoringConfig.correct_draw_points) draws++
      }
    })

    // Top scorer bonus
    const tsp = topScorerPicks.find(t => t.participant_id === p.id)
    if (tsp) total += tsp.points_earned || 0

    // Group order bonus
    groupOrderPicks.filter(g => g.participant_id === p.id).forEach(g => {
      total += g.points_earned || 0
    })

    // Bracket bonus
    bracketPicks.filter(b => b.participant_id === p.id).forEach(b => {
      total += b.points_earned || 0
    })

    return { ...p, total, exact, winners, draws, predCount: predictions.filter(pr => pr.participant_id === p.id).length }
  }).sort((a, b) => b.total - a.total || b.exact - a.exact || b.winners - a.winners)

  function notify(msg, type = 'success') {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3500)
  }

  function loginUser(user) {
    setCurrentUser(user)
    setIsAdmin(user.email === ADMIN_EMAIL)
    localStorage.setItem('mundial2026_user', JSON.stringify(user))
    notify(`¡Bienvenido, ${user.name}! ⚽`)
  }

  function logoutUser() {
    setCurrentUser(null)
    setIsAdmin(false)
    localStorage.removeItem('mundial2026_user')
  }

  const TABS = [
    { id: 'leaderboard', label: '🏆 Tabla', icon: '🏆' },
    { id: 'matches',     label: '⚽ Partidos', icon: '⚽' },
    { id: 'picks',       label: '🎯 Mis Picks', icon: '🎯' },
    { id: 'knockout',    label: '🔥 Eliminatoria', icon: '🔥' },
    { id: 'rules',       label: '📋 Reglas', icon: '📋' },
    ...(isAdmin ? [{ id: 'admin', label: '⚙️ Admin', icon: '⚙️' }] : []),
  ]

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:20, background:'linear-gradient(180deg,#87CEEB,#5cb85c)' }}>
      <div style={{ fontSize:60, animation:'bounce 1s ease infinite' }}>⚽</div>
      <p style={{ fontFamily:'var(--font-o)', fontSize:18, letterSpacing:3, color:'#003087', textTransform:'uppercase' }}>Cargando Mundial en la Oficina...</p>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', position:'relative' }}>
      <Background />
      <Header currentUser={currentUser} onLogout={logoutUser} isAdmin={isAdmin} onGoToPicks={() => setTab('picks')} />

      {notification && <Notification {...notification} />}

      {/* Alerts: upcoming matches in 1 hour */}
      {alerts.length > 0 && currentUser && (
        <div style={{ background:'linear-gradient(135deg,#003087,#001a5e)', borderBottom:'2px solid var(--gold)', padding:'8px 16px', textAlign:'center', position:'sticky', top:74, zIndex:150 }}>
          <span style={{ fontFamily:'var(--font-o)', fontSize:13, color:'var(--gold)', letterSpacing:1 }}>
            ⏰ ¡Atención! Partido en menos de 1 hora: {alerts.map(a => `${a.home_flag} ${a.home_team} vs ${a.away_team} ${a.away_flag}`).join(' · ')} — ¡Llena ya tu predicción!
          </span>
        </div>
      )}

      <main style={{ maxWidth:1060, margin:'0 auto', padding:'0 14px 90px' }}>
        {/* Stats bar */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, margin:'16px 0' }}>
          {[
            { icon:'👥', val: participants.filter(p=>!p.is_admin).length, lbl:'Jugadores' },
            { icon:'⚽', val: matches.length, lbl:'Partidos' },
            { icon:'✅', val: matches.filter(m=>m.is_finished).length, lbl:'Finalizados' },
            { icon:'📅', val: Math.max(0, Math.ceil((new Date('2026-06-11') - new Date()) / 86400000)), lbl:'Días p/ inicio' },
          ].map(s => (
            <div key={s.lbl} style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px', textAlign:'center', boxShadow:'var(--shadow)', backdropFilter:'blur(10px)' }}>
              <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontFamily:'var(--font-d)', fontSize:32, color:'var(--blue)', lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:2, textTransform:'uppercase', marginTop:3 }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:16, background:'var(--glass2)', border:'1px solid var(--border)', padding:4, borderRadius:'var(--r)', backdropFilter:'blur(10px)', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, minWidth:90, padding:'11px 6px',
              background: tab === t.id ? 'linear-gradient(135deg,var(--blue),var(--blue-dark))' : 'transparent',
              color: tab === t.id ? 'var(--gold)' : 'var(--text2)',
              border:'none', borderRadius:10,
              fontFamily:'var(--font-c)', fontSize:13, fontWeight:700, letterSpacing:0.5,
              cursor:'pointer', transition:'all 0.2s', whiteSpace:'nowrap',
              boxShadow: tab === t.id ? '0 4px 16px rgba(0,48,135,0.35)' : 'none',
              transform: tab === t.id ? 'translateY(-1px)' : 'none'
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div className="fade-up" key={tab}>
          {tab === 'leaderboard' && <Leaderboard leaderboard={leaderboard} currentUser={currentUser} scoringConfig={scoringConfig} />}
          {tab === 'matches'     && <Matches matches={matches} predictions={predictions} currentUser={currentUser} formatDate={formatDateColombia} isLocked={isMatchLocked} />}
          {tab === 'picks'       && <MyPicks currentUser={currentUser} matches={matches} predictions={predictions} groupOrderPicks={groupOrderPicks} topScorerPicks={topScorerPicks} scoringConfig={scoringConfig} onRefresh={loadAll} notify={notify} loginUser={loginUser} participants={participants} />}
          {tab === 'knockout'    && <Knockout currentUser={currentUser} matches={matches} bracketPicks={bracketPicks} appConfig={appConfig} scoringConfig={scoringConfig} onRefresh={loadAll} notify={notify} />}
          {tab === 'rules'       && <Rules scoringConfig={scoringConfig} />}
          {tab === 'admin'       && isAdmin && <AdminPanel matches={matches} participants={participants} scoringConfig={scoringConfig} appConfig={appConfig} predictions={predictions} groupOrderPicks={groupOrderPicks} topScorerPicks={topScorerPicks} onRefresh={loadAll} notify={notify} />}
        </div>
      </main>

      {/* Watermark */}
      <div style={{ textAlign:'center', padding:'8px 0 70px', fontSize:11, color:'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:1 }}>
        Desarrollado por <strong style={{ color:'var(--blue)' }}>Juan Sebastián Martínez</strong> · Mundial en la Oficina 2026
      </div>

      {/* Bottom nav mobile */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'var(--glass)', borderTop:'2px solid var(--border)', display:'flex', padding:'6px 0', zIndex:100, backdropFilter:'blur(16px)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, background:'none', border:'none', color: tab===t.id ? 'var(--blue)' : 'var(--text3)', fontSize:22, padding:'4px 0', transition:'color 0.2s', fontWeight: tab===t.id?700:400 }}>{t.icon}</button>
        ))}
      </nav>
    </div>
  )
}
