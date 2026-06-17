import { useState, useEffect } from 'react'
import { supabase, calcularPuntos } from '../lib/supabase.js'

export default function Predictions({ currentUser, matches, predictions, scoringConfig, onRefresh, notify }) {
  const [saving, setSaving] = useState({})
  const [localPreds, setLocalPreds] = useState({})

  const pendingMatches = matches.filter(m => !m.is_finished)
  const finishedMatches = matches.filter(m => m.is_finished)

  // Inicializar predicciones locales
  useEffect(() => {
    const initial = {}
    predictions.filter(p => p.participant_id === currentUser.id).forEach(p => {
      initial[p.match_id] = { home: p.predicted_home, away: p.predicted_away }
    })
    setLocalPreds(initial)
  }, [predictions, currentUser.id])

  function getMyPred(matchId) {
    return predictions.find(p => p.participant_id === currentUser.id && p.match_id === matchId)
  }

  async function savePrediction(matchId) {
    const pred = localPreds[matchId]
    if (pred?.home === undefined || pred?.away === undefined) return

    setSaving(s => ({ ...s, [matchId]: true }))
    const existing = getMyPred(matchId)

    if (existing) {
      await supabase.from('predictions').update({
        predicted_home: parseInt(pred.home),
        predicted_away: parseInt(pred.away)
      }).eq('id', existing.id)
    } else {
      await supabase.from('predictions').insert({
        participant_id: currentUser.id,
        match_id: matchId,
        predicted_home: parseInt(pred.home),
        predicted_away: parseInt(pred.away)
      })
    }

    setSaving(s => ({ ...s, [matchId]: false }))
    onRefresh()
    notify('✅ Predicción guardada')
  }

  function formatDate(d) {
    if (!d) return 'TBD'
    return new Date(d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const myPoints = finishedMatches.reduce((acc, m) => {
    const pred = getMyPred(m.id)
    if (!pred) return acc
    return acc + calcularPuntos(pred.predicted_home, pred.predicted_away, m.home_score, m.away_score, scoringConfig)
  }, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, letterSpacing: 3, color: 'var(--gold)' }}>
            MIS PREDICCIONES
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Hola, <strong>{currentUser.name}</strong> · {pendingMatches.length} partidos pendientes</p>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #1a1500, #2a2200)',
          border: '1px solid var(--gold)', borderRadius: 'var(--radius)',
          padding: '16px 24px', textAlign: 'center',
          boxShadow: '0 0 24px rgba(245,197,24,0.15)'
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--gold)', letterSpacing: 2 }}>{myPoints}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-cond)', letterSpacing: 2 }}>MIS PUNTOS</div>
        </div>
      </div>

      {/* Partidos pendientes */}
      {pendingMatches.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontFamily: 'var(--font-cond)', fontSize: 14, letterSpacing: 3, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>
            ⚽ PARTIDOS POR JUGAR — Haz tu predicción
          </h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {pendingMatches.map(match => {
              const myPred = getMyPred(match.id)
              const local = localPreds[match.id]
              const hasLocal = local?.home !== undefined && local?.away !== undefined
              const isSaved = !!myPred
              const changed = myPred && (parseInt(local?.home) !== myPred.predicted_home || parseInt(local?.away) !== myPred.predicted_away)

              return (
                <div key={match.id} style={{
                  background: 'var(--surface)', border: `1px solid ${isSaved ? 'rgba(79,195,247,0.3)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', padding: '16px 20px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{match.home_flag}</span>
                      <span style={{ fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: 15 }}>{match.home_team}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text3)', letterSpacing: 2 }}>VS</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-cond)' }}>{formatDate(match.match_date)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                      <span style={{ fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: 15 }}>{match.away_team}</span>
                      <span style={{ fontSize: 24 }}>{match.away_flag}</span>
                    </div>
                  </div>

                  {/* Input predicción */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <input
                      type="number" min="0" max="20"
                      value={local?.home ?? myPred?.predicted_home ?? ''}
                      onChange={e => setLocalPreds(p => ({ ...p, [match.id]: { ...p[match.id], home: e.target.value } }))}
                      placeholder="0"
                      style={inputStyle}
                    />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text3)' }}>—</span>
                    <input
                      type="number" min="0" max="20"
                      value={local?.away ?? myPred?.predicted_away ?? ''}
                      onChange={e => setLocalPreds(p => ({ ...p, [match.id]: { ...p[match.id], away: e.target.value } }))}
                      placeholder="0"
                      style={inputStyle}
                    />
                    <button
                      onClick={() => savePrediction(match.id)}
                      disabled={saving[match.id] || !hasLocal}
                      style={{
                        background: (changed || !isSaved) ? 'var(--gold)' : 'var(--surface2)',
                        color: (changed || !isSaved) ? '#000' : 'var(--text2)',
                        border: 'none', borderRadius: 8, padding: '10px 20px',
                        fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: 13,
                        letterSpacing: 1, cursor: hasLocal ? 'pointer' : 'not-allowed',
                        opacity: !hasLocal ? 0.5 : 1, transition: 'all 0.2s'
                      }}
                    >
                      {saving[match.id] ? '...' : isSaved ? (changed ? 'ACTUALIZAR' : '✓ GUARDADO') : 'GUARDAR'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Partidos finalizados */}
      {finishedMatches.length > 0 && (
        <section>
          <h3 style={{ fontFamily: 'var(--font-cond)', fontSize: 14, letterSpacing: 3, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>
            ✅ PARTIDOS FINALIZADOS
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {finishedMatches.map(match => {
              const myPred = getMyPred(match.id)
              const pts = myPred
                ? calcularPuntos(myPred.predicted_home, myPred.predicted_away, match.home_score, match.away_score, scoringConfig)
                : null

              return (
                <div key={match.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                  display: 'grid', gridTemplateColumns: '1fr auto 1fr auto',
                  gap: 12, alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{match.home_flag}</span>
                    <span style={{ fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: 14 }}>{match.home_team}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--green)', letterSpacing: 3 }}>
                      {match.home_score} - {match.away_score}
                    </div>
                    {myPred && (
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        Tu pred: {myPred.predicted_home}-{myPred.predicted_away}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <span style={{ fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: 14 }}>{match.away_team}</span>
                    <span>{match.away_flag}</span>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 60 }}>
                    {pts !== null ? (
                      <span style={{
                        background: pts === scoringConfig.exact_score_points ? 'rgba(46,194,126,0.2)'
                          : pts > 0 ? 'rgba(79,195,247,0.2)' : 'rgba(230,57,70,0.15)',
                        color: pts === scoringConfig.exact_score_points ? 'var(--green)'
                          : pts > 0 ? 'var(--blue)' : 'var(--red)',
                        borderRadius: 6, padding: '4px 10px',
                        fontFamily: 'var(--font-display)', fontSize: 18
                      }}>
                        {pts > 0 ? '+' : ''}{pts}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text3)', fontSize: 12 }}>Sin pred.</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

const inputStyle = {
  width: 60, textAlign: 'center',
  background: 'var(--surface2)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '10px 8px', borderRadius: 8,
  fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 1,
  outline: 'none'
}
