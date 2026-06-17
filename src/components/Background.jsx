import { useEffect, useRef } from 'react'

export default function Background() {
  const cloudsRef = useRef(null)
  const particlesRef = useRef(null)

  useEffect(() => {
    // Clouds
    const cloudData = [
      [200,8,14,22],[140,4,10,30],[260,32,16,18],[110,18,9,28],[180,24,12,35],[90,10,8,20]
    ]
    cloudData.forEach(([w,t,h,dur]) => {
      const c = document.createElement('div')
      c.style.cssText = `position:absolute;width:${w}px;height:${h}px;top:${t}%;left:-${w+20}px;border-radius:50px;background:rgba(255,255,255,${0.6+Math.random()*0.3});filter:blur(3px);animation:drift ${dur}s linear infinite;animation-delay:${Math.random()*dur}s`
      cloudsRef.current?.appendChild(c)
    })

    // Particles
    const emojis = ['⚽','🏆','⭐','🎯','🌟']
    for (let i = 0; i < 12; i++) {
      const d = document.createElement('div')
      d.style.cssText = `position:absolute;animation:particle ${14+Math.random()*18}s linear infinite;animation-delay:${Math.random()*16}s;opacity:0;left:${Math.random()*100}%`
      if (Math.random() > 0.5) {
        d.style.fontSize = (10 + Math.random() * 14) + 'px'
        d.textContent = emojis[Math.floor(Math.random() * emojis.length)]
      } else {
        const s = (4 + Math.random() * 7) + 'px'
        d.style.cssText += `;width:${s};height:${s};border-radius:50%;background:${['#FFD700','#CE1126','#003087','#16a34a'][Math.floor(Math.random()*4)]}`
      }
      particlesRef.current?.appendChild(d)
    }
  }, [])

  return (
    <>
      {/* Sky to grass gradient */}
      <div style={{ position:'fixed', inset:0, zIndex:0, background:'linear-gradient(180deg,#87CEEB 0%,#b8e4f7 20%,#d4eefc 35%,#e8f7e0 55%,#5cb85c 70%,#3a8a3a 82%,#2d6e2d 100%)' }} />
      {/* Clouds layer */}
      <div ref={cloudsRef} style={{ position:'fixed', top:0, left:0, right:0, height:'45%', zIndex:0, overflow:'hidden', pointerEvents:'none' }} />
      {/* Grass lines */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:'35%', zIndex:0, background:'repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 60px)' }} />
      {/* Readability overlay */}
      <div style={{ position:'fixed', inset:0, zIndex:0, background:'linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.15) 30%,rgba(255,255,255,0.6) 55%,rgba(255,255,255,0.88) 70%,rgba(255,255,255,0.94) 100%)' }} />
      {/* Floating trophy */}
      <div style={{ position:'fixed', right:-10, top:90, fontSize:160, opacity:0.06, zIndex:0, pointerEvents:'none', animation:'float 6s ease-in-out infinite', filter:'drop-shadow(0 0 30px rgba(255,180,0,0.3))' }}>🏆</div>
      {/* Particles */}
      <div ref={particlesRef} style={{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none', overflow:'hidden' }} />
    </>
  )
}
