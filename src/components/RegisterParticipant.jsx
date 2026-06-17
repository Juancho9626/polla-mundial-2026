import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const COLORS = ['#e63946', '#f5c518', '#2ec27e', '#4fc3f7', '#a78bfa', '#fb923c', '#f472b6', '#34d399']

export default function RegisterParticipant({ onRegister, participants, notify, onRefresh }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!name.trim() || !email.trim()) return notify('Completa todos los campos', 'error')
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(email)) return notify('Email inválido', 'error')

    setLoading(true)
    const { data, error } = await supabase.from('participants').insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      avatar_color: color
    }).select().single()

    setLoading(false)
    if (error) {
      if (error.code === '23505') {
        notify('Este email ya está registrado. Usa "Iniciar sesión"', 'error')
      } else {
        notify('Error al registrar: ' + error.message, 'error')
      }
      return
    }
    onRefresh()
    onRegister(data)
  }

  async function handleLogin() {
    if (!email.trim()) return notify('Ingresa tu email', 'error')
    setLoading(true)
    const { data } = await supabase.from('participants').select('*').eq('email', email.toLowerCase().trim()).single()
    setLoading(false)
    if (!data) return notify('Email no encontrado. ¿Ya te registraste?', 'error')
    onRegister(data)
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12, animation: 'bounce 1.5s ease infinite' }}>🎯</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, letterSpacing: 3, color: 'var(--gold)' }}>
          {mode === 'register' ? 'UNIRTE A LA POLLA' : 'INICIAR SESIÓN'}
        </h2>
        <p style={{ color: 'var(--text2)', marginTop: 8 }}>
          {mode === 'register' ? 'Regístrate para ingresar tus predicciones' : 'Ingresa tu email para continuar'}
        </p>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 28
      }}>
        {/* Toggle */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 8, padding: 4, marginBottom: 24, gap: 4 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px 0',
              background: mode === m ? 'var(--gold)' : 'transparent',
              color: mode === m ? '#000' : 'var(--text2)',
              border: 'none', borderRadius: 6,
              fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: 13, letterSpacing: 1,
              transition: 'all 0.2s'
            }}>
              {m === 'login' ? 'INICIAR SESIÓN' : 'REGISTRARSE'}
            </button>
          ))}
        </div>

        {mode === 'register' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nombre</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Tu nombre completo"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : null)}
          />
        </div>

        {mode === 'register' && (
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Color de avatar</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: color === c ? '3px solid var(--text)' : '3px solid transparent',
                  cursor: 'pointer', transition: 'transform 0.15s',
                  transform: color === c ? 'scale(1.2)' : 'scale(1)'
                }} />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          style={{
            width: '100%', background: 'var(--gold)', color: '#000',
            border: 'none', borderRadius: 8, padding: '14px',
            fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: 16, letterSpacing: 2,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s'
          }}
        >
          {loading ? '...' : mode === 'login' ? 'ENTRAR' : '¡UNIRME AL TORNEO!'}
        </button>

        {participants.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, fontFamily: 'var(--font-cond)', letterSpacing: 1 }}>
              {participants.length} PARTICIPANTES REGISTRADOS
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {participants.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--surface2)', borderRadius: 20,
                  padding: '4px 10px', fontSize: 12
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: p.avatar_color || 'var(--red)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#fff', fontWeight: 700
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: 'var(--text2)' }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle = { fontSize: 12, fontFamily: 'var(--font-cond)', letterSpacing: 1, color: 'var(--text2)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
const inputStyle = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '12px 14px', borderRadius: 8,
  fontSize: 15, outline: 'none', fontFamily: 'var(--font-body)',
  transition: 'border-color 0.2s'
}
