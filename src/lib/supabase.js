import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yvyiwkusnjlychdxffhy.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2eWl3a3VzbmpseWNoZHhmZmh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTQyMDEsImV4cCI6MjA5NjA3MDIwMX0.gjg6LSYuByDLlrmsjbFZG5OeXpPMRI4eLg9QX34r1HA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const ADMIN_EMAIL = 'juancho9626@gmail.com'
export const ADMIN_PASSWORD = 'Oigame*2026'

export function nowColombia() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}

export function isMatchLocked(matchDate) {
  if (!matchDate) return false
  const now = new Date()
  const kickoff = new Date(matchDate)
  const diffMin = (kickoff - now) / 60000
  return diffMin <= 30
}

export function isMatchAlertActive(matchDate) {
  if (!matchDate) return false
  const now = new Date()
  const kickoff = new Date(matchDate)
  const diffMin = (kickoff - now) / 60000
  return diffMin > 0 && diffMin <= 60
}

export function formatDateColombia(dateStr) {
  if (!dateStr) return 'Por definir'
  const d = new Date(dateStr)
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })
}

// =============================================
// SISTEMA DE PUNTOS (fase de grupos):
// 5 pts → Marcador exacto
// 3 pts → Ganador correcto SIN marcador exacto
// 3 pts → Empate correcto SIN marcador exacto
// 1 pt  → Sin acierto
//
// FASE ELIMINATORIA — empates (pasan a penaltis):
// Se pasa penaltyOpts = { predPenWinner, realPenWinner }
// Empate exacto    + ganador penales correcto   → 5 pts
// Empate exacto    + ganador penales incorrecto  → 3 pts
// Empate no exacto + ganador penales correcto    → 3 pts
// Empate no exacto + ganador penales incorrecto  → 1 pt
// =============================================
// hasPrediction : true si el jugador llenó el marcador, false si quedó 0-0 por defecto
// penaltyOpts   : { predPenWinner, realPenWinner } — solo para partidos eliminatorios con empate real
export function calcularPuntos(predHome, predAway, realHome, realAway, config, hasPrediction = true, penaltyOpts = null) {
  if (realHome === null || realAway === null) return 0
  const { exact_score_points, correct_winner_points, no_hit_points } = config

  // Sin predicción real → 1 pt siempre
  if (!hasPrediction) return no_hit_points

  const isRealDraw    = realHome === realAway
  const isPredDraw    = predHome === predAway
  const isExactScore  = predHome === realHome && predAway === realAway

  // --- FASE ELIMINATORIA: empate real con opciones de penaltis ---
  if (isRealDraw && penaltyOpts) {
    const { predPenWinner, realPenWinner } = penaltyOpts
    const correctPen = !!(realPenWinner && predPenWinner && predPenWinner === realPenWinner)

    if (isExactScore) {
      // Empate exacto + penales correctos → 5 | + penales incorrectos/sin pick → 3
      return correctPen ? exact_score_points : correct_winner_points
    }
    if (isPredDraw) {
      // Empate no exacto + penales correctos → 3 | + penales incorrectos/sin pick → 1
      return correctPen ? correct_winner_points : no_hit_points
    }
    // Predijo ganador pero fue empate → sin acierto
    return no_hit_points
  }

  // --- FLUJO NORMAL (grupos o eliminatoria sin empate real) ---

  // Marcador exacto
  if (isExactScore) return exact_score_points

  const predResult = Math.sign(predHome - predAway)
  const realResult = Math.sign(realHome - realAway)

  // Ganador correcto O empate correcto sin marcador exacto
  if (predResult === realResult) return correct_winner_points

  // Sin acierto
  return no_hit_points
}
