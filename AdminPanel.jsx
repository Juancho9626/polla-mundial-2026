import { useState } from 'react'
import { supabase, calcularPuntos } from '../lib/supabase.js'

export default function AdminPanel({ matches, participants, scoringConfig, appConfig, predictions, groupOrderPicks, topScorerPicks, onRefresh, notify }) {
  const [scores, setScores]     = useState({})
  const [saving, setSaving]     = useState({})
  const [resetting, setResetting] = useState({})
  const [adminTab, setAdminTab] = useState('results')
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName]   = useState('')
  const [topScorerAnswer, setTopScorerAnswer] = useState(appConfig?.top_scorer_answer || '')
  const [showFinished, setShowFinished] = useState(false)
  const [classifiedAnswers, setClassifiedAnswers] = useState({})
  const [savingClassified, setSavingClassified] = useState(false)

  async function saveResult(matchId) {
    const match = matches.find(m => m.id === matchId)
    const s = scores[matchId]
    const homeRaw = s?.home ?? match?.home_score
    const awayRaw = s?.away ?? match?.away_score
    if (homeRaw === undefined || homeRaw === null || awayRaw === undefined || awayRaw === null)
      return notify('Ingresa los dos marcadores', 'warning')

    // El bloqueo de 30 min solo aplica a partidos que aún no terminaron
    if (!match?.is_finished) {
      const diffMin = (new Date(match?.match_date) - new Date()) / 60000
      if (diffMin > 30) return notify('⚠️ El partido aún no está bloqueado para los jugadores', 'warning')
    }

    setSaving(sv => ({ ...sv, [matchId]: true }))
    const homeScore = parseInt(homeRaw)
    const awayScore = parseInt(awayRaw)

    // 1. Guardar / actualizar el resultado del partido
    await supabase.from('matches').update({ home_score: homeScore, away_score: awayScore, is_finished: true }).eq('id', matchId)

    // 2. Obtener predicciones existentes
    const { data: preds } = await supabase.from('predictions').select('*').eq('match_id', matchId)
    const predParticipantIds = (preds || []).map(p => p.participant_id)

    // 3. Auto-asignar 0-0 con 1 punto a quienes NO predijeron (upsert para no duplicar al recalcular)
    const sinPrediccion = participants.filter(p => !p.is_admin && !predParticipantIds.includes(p.id))
    for (const p of sinPrediccion) {
      await supabase.from('predictions').upsert({
        participant_id: p.id,
        match_id: matchId,
        predicted_home: 0,
        predicted_away: 0,
        is_locked: false,
        points_earned: 1
      }, { onConflict: 'participant_id,match_id' })
    }

    // 4. Recalcular puntos a quienes SÍ predijeron
    if (preds) {
      for (const pred of preds) {
        const hasPrediction = pred.is_locked === true || (pred.predicted_home !== 0 || pred.predicted_away !== 0)
        const pts = calcularPuntos(pred.predicted_home, pred.predicted_away, homeScore, awayScore, scoringConfig, hasPrediction)
        await supabase.from('predictions').update({ points_earned: pts }).eq('id', pred.id)
      }
    }

    setSaving(sv => ({ ...sv, [matchId]: false }))
    setScores(s => { const n={...s}; delete n[matchId]; return n })
    onRefresh()
    notify('✅ Resultado actualizado — puntos recalculados para todos los jugadores')
  }

  async function resetResult(matchId, homeName, awayName) {
    if (!confirm(`¿Resetear el resultado de ${homeName} vs ${awayName}?\n\nEsto borrará el marcador y pondrá el partido como pendiente. Los puntos calculados para este partido quedarán en 0.`)) return
    setResetting(r => ({ ...r, [matchId]: true }))
    await supabase.from('matches').update({ home_score: null, away_score: null, is_finished: false }).eq('id', matchId)
    // Borrar las predicciones 0-0 auto-insertadas (las reales del jugador quedan con is_locked = true)
    await supabase.from('predictions').delete()
      .eq('match_id', matchId).eq('predicted_home', 0).eq('predicted_away', 0).eq('is_locked', false)
    const { data: preds } = await supabase.from('predictions').select('*').eq('match_id', matchId)
    if (preds) {
      for (const pred of preds) {
        await supabase.from('predictions').update({ points_earned: 0 }).eq('id', pred.id)
      }
    }
    setResetting(r => ({ ...r, [matchId]: false }))
    onRefresh()
    notify('🔄 Partido reseteado — puntos revertidos')
  }

  async function addParticipant() {
    if (!newEmail.trim() || !newName.trim()) return notify('Completa email y nombre', 'error')
    if (participants.filter(p=>!p.is_admin).length >= 40) return notify('Ya se alcanzó el máximo de 40 jugadores', 'error')
    const { error } = await supabase.from('participants').insert({ name: newName.trim(), email: newEmail.trim().toLowerCase() })
    if (error) {
      if (error.code === '23505') notify('Este email ya está registrado', 'error')
      else notify('Error: ' + error.message, 'error')
      return
    }
    setNewEmail(''); setNewName('')
    onRefresh()
    notify(`✅ ${newName} agregado al torneo`)
  }

  async function removeParticipant(id, name) {
    if (!confirm(`¿Eliminar a ${name}? Se borrarán todas sus predicciones.`)) return
    await supabase.from('participants').delete().eq('id', id)
    onRefresh()
    notify(`${name} eliminado`)
  }

  async function clearAllPredictions() {
    if (!confirm('⚠️ ¿Borrar TODAS las predicciones y resetear TODOS los resultados?\n\nEsto elimina todos los marcadores, puntos y predicciones. Útil para pruebas.')) return
    await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('top_scorer_picks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('group_order_picks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('matches').update({ home_score: null, away_score: null, is_finished: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    onRefresh()
    notify('🧹 Todo reseteado — listo para pruebas reales')
  }

  async function saveTopScorerAnswer() {
    if (!topScorerAnswer.trim()) return notify('Escribe el nombre del goleador real', 'error')
    await supabase.from('app_config').update({ top_scorer_answer: topScorerAnswer.trim() }).eq('id', appConfig.id)
    const { data: picks } = await supabase.from('top_scorer_picks').select('*')
    if (picks) {
      for (const pick of picks) {
        const pts = pick.player_name.toLowerCase().trim() === topScorerAnswer.toLowerCase().trim() ? scoringConfig.top_scorer_points : 0
        await supabase.from('top_scorer_picks').update({ points_earned: pts }).eq('id', pick.id)
      }
    }
    onRefresh()
    notify('✅ Goleador registrado y puntos calculados')
  }

  async function activateKnockout() {
    if (!confirm('¿Activar fase eliminatoria? Esto habilitará el bracket para todos los jugadores.')) return
    await supabase.from('app_config').update({ knockout_started: true, phase: 'knockout' }).eq('id', appConfig.id)
    onRefresh()
    notify('✅ Fase eliminatoria activada')
  }

  const pendingMatches = matches.filter(m => !m.is_finished && m.stage === 'group')
  const finishedMatches = matches.filter(m => m.is_finished && m.stage === 'group')
  const nonAdminParticipants = participants.filter(p => !p.is_admin)
  const GROUPS = [...new Set(matches.filter(m => m.stage === 'group').map(m => m.group_name))].sort()

  async function calcularPuntosClasificados() {
    // Validar que todos los grupos tengan los 4 puestos ingresados
    const gruposFaltantes = GROUPS.filter(g =>
      !classifiedAnswers[g]?.first || !classifiedAnswers[g]?.second ||
      !classifiedAnswers[g]?.third || !classifiedAnswers[g]?.fourth
    )
    if (gruposFaltantes.length > 0) {
      return notify(`Faltan equipos en los grupos: ${gruposFaltantes.join(', ')}`, 'error')
    }
    if (!confirm(`¿Calcular puntos de clasificados para todos los participantes?\n\nReglas:\n• +${scoringConfig.classified_team_points} pt por cada equipo acertado en el top 2\n• +${scoringConfig.group_order_points} pts si el orden de los 4 es exacto\n\nEsta acción puede repetirse si hay correcciones.`)) return

    setSavingClassified(true)
    const nonAdmin = participants.filter(p => !p.is_admin)

    for (const p of nonAdmin) {
      const misClasificados = groupOrderPicks.filter(g => g.participant_id === p.id)
      for (const pick of misClasificados) {
        const real = classifiedAnswers[pick.group_name]
        if (!real?.first || !real?.second || !real?.third || !real?.fourth) continue

        const realOrden = [real.first.trim(), real.second.trim(), real.third.trim(), real.fourth.trim()]
        const predOrden = [pick.first_place?.trim(), pick.second_place?.trim(), pick.third_place?.trim(), pick.fourth_place?.trim()]
        const realTop2 = realOrden.slice(0, 2)

        // 1 pt por cada equipo del top 2 real que el participante tenga en su propio top 2 (sin importar posición)
        let pts = 0
        predOrden.slice(0, 2).forEach(team => {
          if (team && realTop2.includes(team)) pts += scoringConfig.classified_team_points
        })

        // 5 pts si el orden exacto de los 4 coincide
        const ordenExacto = predOrden.every((team, i) => team && team === realOrden[i])
        if (ordenExacto) pts += scoringConfig.group_order_points

        await supabase.from('group_order_picks').update({ points_earned: pts }).eq('id', pick.id)
      }
    }

    setSavingClassified(false)
    onRefresh()
    notify('✅ Puntos de clasificados calculados para todos los participantes')
  }

  const ADMIN_TABS = [
    { id:'results',      label:'⚽ Resultados' },
    { id:'classified',   label:'📊 Clasificados' },
    { id:'participants', label:'👥 Jugadores' },
    { id:'scorer',       label:'👟 Goleador' },
    { id:'tools',        label:'🧹 Pruebas' },
  ]

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontFamily:'var(--font-o)', fontSize:32, fontWeight:700, letterSpacing:3, color:'var(--blue)', textTransform:'uppercase' }}>⚙️ Panel Admin</h2>
        <p style={{ color:'var(--text2)', fontSize:14, marginTop:4 }}>Solo visible para el administrador</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {ADMIN_TABS.map(t => (
          <button key={t.id} onClick={() => setAdminTab(t.id)} style={{ padding:'9px 16px', borderRadius:'var(--r-sm)', background: adminTab===t.id ? 'var(--blue)' : 'var(--glass)', color: adminTab===t.id ? 'var(--gold)' : 'var(--text2)', border:`1px solid ${adminTab===t.id?'var(--blue)':'var(--border)'}`, fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, letterSpacing:1, cursor:'pointer', transition:'all 0.2s', backdropFilter:'blur(8px)' }}>{t.label}</button>
        ))}
      </div>

      {/* RESULTADOS */}
      {adminTab === 'results' && (
        <div>
          <div style={{ background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:'var(--r)', padding:'14px 18px', marginBottom:16 }}>
            <p style={{ fontSize:13, color:'var(--text2)' }}>⚡ Al guardar un resultado los puntos se recalculan automáticamente para todos los participantes.</p>
          </div>

          <h4 style={{ fontFamily:'var(--font-c)', fontSize:13, letterSpacing:2, color:'var(--text3)', textTransform:'uppercase', marginBottom:12 }}>PARTIDOS PENDIENTES ({pendingMatches.length})</h4>
          <div style={{ display:'grid', gap:8, marginBottom:24 }}>
            {pendingMatches.map(match => {
              const s = scores[match.id] || {}
              return (
                <div key={match.id} style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'14px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', boxShadow:'var(--shadow)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:200 }}>
                    <span style={{ fontSize:11, background:'#f1f5f9', borderRadius:4, padding:'2px 6px', color:'var(--text3)', fontFamily:'var(--font-c)', fontWeight:700, letterSpacing:1 }}>G{match.group_name}</span>
                    <span style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:14 }}>{match.home_team}</span>
                    <span style={{ color:'var(--text3)', fontSize:12 }}>vs</span>
                    <span style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:14 }}>{match.away_team}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="number" min="0" max="30" value={s.home??''} onChange={e=>setScores(sc=>({...sc,[match.id]:{...sc[match.id],home:e.target.value}}))} placeholder="0"
                      style={{ width:52, textAlign:'center', background:'#f8fafc', border:'1px solid var(--border)', color:'var(--text)', padding:'7px 4px', borderRadius:6, fontFamily:'var(--font-d)', fontSize:22, outline:'none' }} />
                    <span style={{ color:'var(--text3)', fontFamily:'var(--font-d)', fontSize:18 }}>—</span>
                    <input type="number" min="0" max="30" value={s.away??''} onChange={e=>setScores(sc=>({...sc,[match.id]:{...sc[match.id],away:e.target.value}}))} placeholder="0"
                      style={{ width:52, textAlign:'center', background:'#f8fafc', border:'1px solid var(--border)', color:'var(--text)', padding:'7px 4px', borderRadius:6, fontFamily:'var(--font-d)', fontSize:22, outline:'none' }} />
                    <button onClick={() => saveResult(match.id)} disabled={saving[match.id]||s.home===undefined||s.away===undefined}
                      style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:6, padding:'8px 16px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:12, letterSpacing:1, cursor:'pointer', opacity:(s.home!==undefined&&s.away!==undefined)?1:0.4, transition:'all 0.2s' }}>
                      {saving[match.id] ? '...' : 'GUARDAR'}
                    </button>
                  </div>
                </div>
              )
            })}
            {pendingMatches.length === 0 && <p style={{ color:'var(--text3)', fontSize:13 }}>No hay partidos pendientes</p>}
          </div>

          {/* Finalizados con opción de editar el marcador y recalcular */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <h4 style={{ fontFamily:'var(--font-c)', fontSize:13, letterSpacing:2, color:'var(--text3)', textTransform:'uppercase' }}>FINALIZADOS ({finishedMatches.length})</h4>
            {finishedMatches.length > 0 && (
              <button onClick={() => setShowFinished(!showFinished)} style={{ fontSize:12, color:'var(--blue)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-c)', fontWeight:700, letterSpacing:1 }}>
                {showFinished ? 'OCULTAR ▲' : 'VER ▼'}
              </button>
            )}
          </div>

          {showFinished && (
            <div style={{ display:'grid', gap:6, marginBottom:24 }}>
              {finishedMatches.map(m => {
                const s = scores[m.id] || {}
                const homeVal = s.home ?? m.home_score
                const awayVal = s.away ?? m.away_score
                const changed = parseInt(homeVal) !== m.home_score || parseInt(awayVal) !== m.away_score
                return (
                  <div key={m.id} style={{ background:'var(--glass)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:'var(--r-sm)', padding:'10px 16px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, background:'#dcfce7', borderRadius:4, padding:'2px 6px', color:'#16a34a', fontFamily:'var(--font-c)', fontWeight:700 }}>G{m.group_name}</span>
                    <span style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, flex:1, minWidth:110 }}>{m.home_team}</span>
                    <input type="number" min="0" max="30" value={homeVal}
                      onChange={e=>setScores(sc=>({...sc,[m.id]:{...sc[m.id],home:e.target.value}}))}
                      style={{ width:46, textAlign:'center', background:'#f8fafc', border:'1px solid var(--border)', padding:'6px 4px', borderRadius:6, fontFamily:'var(--font-d)', fontSize:18, outline:'none' }} />
                    <span style={{ color:'var(--text3)', fontFamily:'var(--font-d)', fontSize:16 }}>—</span>
                    <input type="number" min="0" max="30" value={awayVal}
                      onChange={e=>setScores(sc=>({...sc,[m.id]:{...sc[m.id],away:e.target.value}}))}
                      style={{ width:46, textAlign:'center', background:'#f8fafc', border:'1px solid var(--border)', padding:'6px 4px', borderRadius:6, fontFamily:'var(--font-d)', fontSize:18, outline:'none' }} />
                    <span style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, flex:1, minWidth:110, textAlign:'right' }}>{m.away_team}</span>
                    <button onClick={() => saveResult(m.id)} disabled={saving[m.id] || !changed}
                      style={{ background: changed ? '#16a34a' : '#e2e8f0', color: changed ? '#fff' : 'var(--text3)', border:'none', borderRadius:6, padding:'6px 12px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:11, letterSpacing:1, cursor: changed?'pointer':'not-allowed', whiteSpace:'nowrap', transition:'all 0.2s' }}>
                      {saving[m.id] ? '...' : '💾 GUARDAR Y RECALCULAR'}
                    </button>
                    <button onClick={() => resetResult(m.id, m.home_team, m.away_team)} disabled={resetting[m.id]}
                      style={{ background:'#fee2e2', color:'#dc2626', border:'1px solid #fca5a5', borderRadius:6, padding:'6px 9px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:11, letterSpacing:1, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.2s' }}>
                      {resetting[m.id] ? '...' : '🔄'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Activate knockout */}
          {!appConfig?.knockout_started && finishedMatches.length > 0 && (
            <div style={{ background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.3)', borderRadius:'var(--r)', padding:'20px' }}>
              <h4 style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:14, color:'var(--blue)', letterSpacing:2, marginBottom:10, textTransform:'uppercase' }}>🔥 Activar Fase Eliminatoria</h4>
              <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>Cuando terminen todos los partidos de grupos, activa la fase eliminatoria.</p>
              <button onClick={activateKnockout} style={{ background:'linear-gradient(135deg,var(--blue),var(--blue-dark))', color:'var(--gold)', border:'none', borderRadius:'var(--r-sm)', padding:'12px 24px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:14, letterSpacing:2, cursor:'pointer', textTransform:'uppercase' }}>
                🔥 ACTIVAR ELIMINATORIA
              </button>
            </div>
          )}
        </div>
      )}

      {/* CLASIFICADOS */}
      {adminTab === 'classified' && (
        <div>
          <div style={{ background:'rgba(0,48,135,0.06)', border:'1px solid rgba(0,48,135,0.2)', borderRadius:'var(--r)', padding:'14px 18px', marginBottom:20 }}>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
              📊 Ingresa el <strong>orden real final de los 4 equipos</strong> de cada grupo. Al calcular:<br/>
              <strong>+{scoringConfig.classified_team_points} pt</strong> por cada equipo acertado en el top 2 (sin importar posición) ·
              <strong> +{scoringConfig.group_order_points} pts</strong> si el orden de los <strong>4 equipos es exacto</strong> (1ro=1ro, 2do=2do, 3ro=3ro, 4to=4to)
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:12, marginBottom:24 }}>
            {GROUPS.map(group => {
              const ans = classifiedAnswers[group] || {}
              const gMatches = matches.filter(m => m.group_name === group && m.stage === 'group')
              const teams = [...new Set([...gMatches.map(m => m.home_team), ...gMatches.map(m => m.away_team)])]
              const allFinished = gMatches.length > 0 && gMatches.every(m => m.is_finished)
              return (
                <div key={group} style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px', boxShadow:'var(--shadow)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontFamily:'var(--font-o)', fontSize:15, fontWeight:700, color:'var(--blue)', letterSpacing:2 }}>GRUPO {group}</span>
                    {allFinished
                      ? <span style={{ fontSize:10, background:'#dcfce7', color:'#16a34a', borderRadius:4, padding:'2px 7px', fontFamily:'var(--font-c)', fontWeight:700 }}>✓ Finalizado</span>
                      : <span style={{ fontSize:10, background:'#fef9c3', color:'#ca8a04', borderRadius:4, padding:'2px 7px', fontFamily:'var(--font-c)', fontWeight:700 }}>En curso</span>
                    }
                  </div>
                  <div style={{ display:'grid', gap:6 }}>
                    {[
                      ['first',  '🥇 1er lugar — Clasifica'],
                      ['second', '🥈 2do lugar — Clasifica'],
                      ['third',  '3ro lugar'],
                      ['fourth', '4to lugar'],
                    ].map(([key, label], i) => (
                      <div key={key}>
                        <div style={{ fontSize:10, color: i < 2 ? 'var(--blue)' : 'var(--text3)', fontFamily:'var(--font-c)', letterSpacing:1, marginBottom:4, fontWeight: i < 2 ? 700 : 400 }}>{label}</div>
                        <select
                          value={ans[key] || ''}
                          onChange={e => setClassifiedAnswers(prev => ({ ...prev, [group]: { ...prev[group], [key]: e.target.value } }))}
                          style={{ width:'100%', background:'#f8fafc', border:`1px solid ${ans[key] ? (i < 2 ? 'rgba(0,48,135,0.4)' : 'rgba(0,0,0,0.2)') : 'var(--border)'}`, color:'var(--text)', padding:'8px 10px', borderRadius:8, fontFamily:'var(--font-c)', fontWeight: i < 2 ? 700 : 400, fontSize:13, outline:'none', cursor:'pointer' }}
                        >
                          <option value=''>— Seleccionar equipo —</option>
                          {teams.sort().map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={calcularPuntosClasificados}
            disabled={savingClassified}
            style={{ width:'100%', background: savingClassified ? '#e2e8f0' : 'linear-gradient(135deg,var(--blue),var(--blue-dark))', color: savingClassified ? 'var(--text3)' : 'var(--gold)', border:'none', borderRadius:'var(--r)', padding:'15px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:15, letterSpacing:2, cursor: savingClassified ? 'not-allowed' : 'pointer', textTransform:'uppercase', transition:'all 0.2s' }}
          >
            {savingClassified ? 'Calculando...' : '📊 CALCULAR PUNTOS DE CLASIFICADOS'}
          </button>

          {/* Resumen de picks por grupo */}
          {groupOrderPicks.length > 0 && (
            <div style={{ marginTop:24 }}>
              <h4 style={{ fontFamily:'var(--font-c)', fontSize:12, letterSpacing:2, color:'var(--text3)', textTransform:'uppercase', marginBottom:12 }}>Picks registrados por los participantes</h4>
              <div style={{ display:'grid', gap:6 }}>
                {participants.filter(p => !p.is_admin).map(p => {
                  const picks = groupOrderPicks.filter(g => g.participant_id === p.id)
                  const totalPts = picks.reduce((acc, g) => acc + (g.points_earned || 0), 0)
                  return (
                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#f8fafc', borderRadius:'var(--r-sm)', border:'1px solid var(--border)' }}>
                      <span style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13 }}>{p.name}</span>
                      <span style={{ fontSize:12, color:'var(--text3)' }}>{picks.length} grupos confirmados</span>
                      <span style={{ fontFamily:'var(--font-d)', fontSize:20, color: totalPts > 0 ? 'var(--blue)' : 'var(--text3)', minWidth:60, textAlign:'right' }}>
                        {totalPts > 0 ? `+${totalPts} pts` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* JUGADORES */}
      {adminTab === 'participants' && (
        <div>
          <div style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'22px', marginBottom:16, boxShadow:'var(--shadow)' }}>
            <h4 style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, letterSpacing:2, color:'var(--text3)', textTransform:'uppercase', marginBottom:16 }}>➕ Agregar Participante</h4>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="correo@email.com" type="email"
                style={{ flex:1, minWidth:180, background:'#f8fafc', border:'1px solid var(--border)', color:'var(--text)', padding:'10px 14px', borderRadius:'var(--r-sm)', fontSize:14, fontFamily:'var(--font-b)', outline:'none' }} />
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nombre completo"
                style={{ width:200, background:'#f8fafc', border:'1px solid var(--border)', color:'var(--text)', padding:'10px 14px', borderRadius:'var(--r-sm)', fontSize:14, fontFamily:'var(--font-b)', outline:'none' }} />
              <button onClick={addParticipant} style={{ background:'linear-gradient(135deg,var(--blue),var(--blue-dark))', color:'var(--gold)', border:'none', borderRadius:'var(--r-sm)', padding:'10px 22px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:14, letterSpacing:1, cursor:'pointer', whiteSpace:'nowrap' }}>+ AGREGAR</button>
            </div>
          </div>

          <div style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'22px', boxShadow:'var(--shadow)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h4 style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, letterSpacing:2, color:'var(--text3)', textTransform:'uppercase' }}>JUGADORES REGISTRADOS</h4>
              <span style={{ fontFamily:'var(--font-d)', fontSize:24, color:'var(--blue)' }}>{nonAdminParticipants.length} / 40</span>
            </div>
            <div style={{ background:'#f1f5f9', borderRadius:8, height:10, marginBottom:16, overflow:'hidden' }}>
              <div style={{ width:`${(nonAdminParticipants.length/40)*100}%`, height:'100%', background:'linear-gradient(90deg,var(--blue),#4fc3f7)', borderRadius:8, transition:'width 1s ease' }} />
            </div>
            <div style={{ display:'grid', gap:8 }}>
              {nonAdminParticipants.map((p, i) => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f8fafc', borderRadius:'var(--r-sm)', border:'1px solid var(--border)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:['#003087','#4fc3f7','#e63946','#2ec27e','#a78bfa','#fb923c'][i%6], display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'var(--font-c)', fontWeight:800, fontSize:13 }}>{p.name[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{p.email}</div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{new Date(p.created_at).toLocaleDateString('es-CO')}</div>
                  <button onClick={() => removeParticipant(p.id, p.name)} style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:6, padding:'5px 10px', fontSize:12, cursor:'pointer', fontFamily:'var(--font-c)', fontWeight:700 }}>✕</button>
                </div>
              ))}
              {nonAdminParticipants.length === 0 && <p style={{ color:'var(--text3)', fontSize:13, textAlign:'center', padding:20 }}>No hay participantes aún</p>}
            </div>
          </div>
        </div>
      )}

      {/* GOLEADOR */}
      {adminTab === 'scorer' && (
        <div style={{ maxWidth:520 }}>
          <div style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'24px', boxShadow:'var(--shadow)' }}>
            <h4 style={{ fontFamily:'var(--font-o)', fontSize:20, fontWeight:700, color:'var(--blue)', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>👟 Goleador del Mundial</h4>
            <div style={{ background:'rgba(220,38,38,0.08)', border:'2px solid #dc2626', borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:12 }}>
              <span style={{ fontSize:22, flexShrink:0 }}>⚠️</span>
              <div>
                <p style={{ fontFamily:'var(--font-c)', fontWeight:700, fontSize:13, color:'#dc2626', letterSpacing:1, marginBottom:4, textTransform:'uppercase' }}>¡Valida el nombre correcto!</p>
                <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>Una vez guardado, el goleador queda <strong>definitivo y bloqueado</strong>. Los puntos se calculan automáticamente.</p>
              </div>
            </div>
            {appConfig?.top_scorer_locked ? (
              <div>
                <div style={{ background:'rgba(22,163,74,0.08)', border:'2px solid #16a34a', borderRadius:'var(--r-sm)', padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
                  <span style={{ fontSize:28 }}>🔒</span>
                  <div>
                    <p style={{ fontSize:11, fontFamily:'var(--font-c)', letterSpacing:2, color:'#16a34a', textTransform:'uppercase', marginBottom:4 }}>Goleador oficial — definitivo</p>
                    <p style={{ fontFamily:'var(--font-d)', fontSize:26, color:'var(--blue)', letterSpacing:2 }}>{appConfig.top_scorer_answer}</p>
                  </div>
                </div>
                <div style={{ background:'rgba(220,38,38,0.05)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:'var(--r-sm)', padding:'14px 18px' }}>
                  <p style={{ fontSize:12, color:'var(--text2)', marginBottom:12, lineHeight:1.6 }}>🔐 Campo bloqueado. Usa el override si necesitas corregir un error.</p>
                  <button
                    onClick={async () => {
                      const confirmar = confirm(`⚠️ OVERRIDE DE ADMINISTRADOR\n\nEstás a punto de desbloquear el goleador "${appConfig.top_scorer_answer}" para corregirlo.\n\n¿Confirmas?`)
                      if (!confirmar) return
                      await supabase.from('app_config').update({ top_scorer_locked: false }).eq('id', appConfig.id)
                      onRefresh()
                      notify('🔓 Goleador desbloqueado — modifica y vuelve a guardar', 'warning')
                    }}
                    style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:'var(--r-sm)', padding:'10px 20px', fontFamily:'var(--font-c)', fontWeight:700, fontSize:12, letterSpacing:1, cursor:'pointer', textTransform:'uppercase' }}>
                    🔓 OVERRIDE ADMIN — DESBLOQUEAR
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color:'var(--text2)', fontSize:13, marginBottom:14 }}>Al guardar se calculan automáticamente los <strong>10 puntos</strong> y el campo queda bloqueado permanentemente.</p>
                <input
                  value={topScorerAnswer}
                  onChange={e => setTopScorerAnswer(e.target.value.toUpperCase())}
                  placeholder="NOMBRE DEL GOLEADOR REAL"
                  style={{ width:'100%', background:'#f8fafc', border:'2px solid var(--blue)', color:'var(--text)', padding:'13px 16px', borderRadius:'var(--r-sm)', fontSize:16, fontFamily:'var(--font-c)', fontWeight:700, letterSpacing:2, outline:'none', marginBottom:14, textTransform:'uppercase', boxSizing:'border-box' }}
                />
                {topScorerAnswer.trim().length > 0 && (
                  <div style={{ background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.4)', borderRadius:'var(--r-sm)', padding:'10px 14px', marginBottom:14, fontSize:13, color:'var(--text2)' }}>
                    📋 Se guardará como: <strong style={{ color:'var(--blue)', fontFamily:'var(--font-c)', letterSpacing:1 }}>{topScorerAnswer.trim()}</strong>
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (!topScorerAnswer.trim()) return notify('Escribe el nombre del goleador real', 'error')
                    const nombre = topScorerAnswer.trim().toUpperCase()
                    const confirmar = confirm(`⚠️ CONFIRMACIÓN FINAL\n\nGoleador: "${nombre}"\n\nEste nombre quedará DEFINITIVO y BLOQUEADO.\n¿Es correcto?`)
                    if (!confirmar) return
                    await supabase.from('app_config').update({ top_scorer_answer: nombre, top_scorer_locked: true }).eq('id', appConfig.id)
                    const { data: picks } = await supabase.from('top_scorer_picks').select('*')
                    if (picks) {
                      for (const pick of picks) {
                        const pts = pick.player_name.toUpperCase().trim() === nombre ? scoringConfig.top_scorer_points : 0
                        await supabase.from('top_scorer_picks').update({ points_earned: pts }).eq('id', pick.id)
                      }
                    }
                    setTopScorerAnswer(nombre)
                    onRefresh()
                    notify('🔒 Goleador registrado y bloqueado — puntos calculados')
                  }}
                  style={{ width:'100%', background:'linear-gradient(135deg,var(--gold),var(--gold2))', color:'#000', border:'none', borderRadius:'var(--r-sm)', padding:14, fontFamily:'var(--font-c)', fontWeight:700, fontSize:15, letterSpacing:2, cursor:'pointer', textTransform:'uppercase' }}>
                  🔒 GUARDAR Y BLOQUEAR DEFINITIVAMENTE
                </button>
              </div>
            )}
            {topScorerPicks.length > 0 && (
              <div style={{ marginTop:24 }}>
                <h5 style={{ fontFamily:'var(--font-c)', fontSize:12, letterSpacing:2, color:'var(--text3)', textTransform:'uppercase', marginBottom:10 }}>Picks registrados ({topScorerPicks.length})</h5>
                {topScorerPicks.map(t => {
                  const p = participants.find(pa => pa.id === t.participant_id)
                  return p ? (
                    <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background: t.points_earned > 0 ? 'rgba(22,163,74,0.08)' : '#f8fafc', border:`1px solid ${t.points_earned > 0 ? 'rgba(22,163,74,0.3)' : 'var(--border)'}`, borderRadius:8, marginBottom:6, fontSize:13 }}>
                      <span style={{ fontWeight:600 }}>{p.name}</span>
                      <span style={{ color:'var(--text2)', fontFamily:'var(--font-c)', letterSpacing:1 }}>{t.player_name}</span>
                      {appConfig?.top_scorer_locked && (
                        <span style={{ fontWeight:700, minWidth:60, textAlign:'right', color: t.points_earned > 0 ? '#16a34a' : 'var(--text3)' }}>
                          {t.points_earned > 0 ? `✅ +${t.points_earned} pts` : '—'}
                        </span>
                      )}
                    </div>
                  ) : null
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HERRAMIENTAS DE PRUEBA */}
      {adminTab === 'tools' && (
        <div style={{ maxWidth:520 }}>
          <div style={{ background:'rgba(220,38,38,0.05)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'var(--r)', padding:'24px', marginBottom:16 }}>
            <h4 style={{ fontFamily:'var(--font-o)', fontSize:18, fontWeight:700, color:'#dc2626', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>🧹 Resetear para Pruebas</h4>
            <p style={{ color:'var(--text2)', fontSize:13, marginBottom:20, lineHeight:1.6 }}>
              Borra <strong>todas las predicciones</strong>, <strong>todos los resultados</strong> y <strong>todos los puntos</strong> de la base de datos. Los participantes y partidos quedan intactos.<br/><br/>
              Úsalo cuando termines de probar para dejar todo limpio antes del torneo real.
            </p>
            <button onClick={clearAllPredictions} style={{ width:'100%', background:'linear-gradient(135deg,#dc2626,#b91c1c)', color:'#fff', border:'none', borderRadius:'var(--r-sm)', padding:14, fontFamily:'var(--font-c)', fontWeight:700, fontSize:15, letterSpacing:2, cursor:'pointer', textTransform:'uppercase' }}>
              🧹 BORRAR TODO Y RESETEAR
            </button>
          </div>

          <div style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'24px', boxShadow:'var(--shadow)' }}>
            <h4 style={{ fontFamily:'var(--font-o)', fontSize:18, fontWeight:700, color:'var(--blue)', letterSpacing:2, textTransform:'uppercase', marginBottom:16 }}>📊 Estado Actual</h4>
            <div style={{ display:'grid', gap:10 }}>
              {[
                { label:'Participantes', val: participants.filter(p=>!p.is_admin).length, icon:'👥' },
                { label:'Partidos totales', val: matches.length, icon:'⚽' },
                { label:'Partidos finalizados', val: matches.filter(m=>m.is_finished).length, icon:'✅' },
                { label:'Predicciones registradas', val: predictions.length, icon:'🎯' },
                { label:'Picks de goleador', val: topScorerPicks.length, icon:'👟' },
                { label:'Picks de orden de grupo', val: groupOrderPicks.length, icon:'📊' },
              ].map(stat => (
                <div key={stat.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#f8fafc', borderRadius:'var(--r-sm)', border:'1px solid var(--border)' }}>
                  <span style={{ color:'var(--text2)', fontSize:14 }}>{stat.icon} {stat.label}</span>
                  <span style={{ fontFamily:'var(--font-d)', fontSize:22, color:'var(--blue)' }}>{stat.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
