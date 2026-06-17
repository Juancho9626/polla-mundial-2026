// Calcula la tabla de posiciones de un grupo basado en predicciones
export function calcularTablaGrupo(teams, partidosGrupo, prediccionesJugador) {
  // Inicializar tabla
  const tabla = {}
  teams.forEach(t => {
    tabla[t] = { team: t, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0, pts:0 }
  })

  // Procesar cada partido del grupo
  partidosGrupo.forEach(match => {
    const pred = prediccionesJugador[match.id]
    if (pred?.home === undefined || pred?.away === undefined) return
    if (!tabla[match.home_team] || !tabla[match.away_team]) return

    const gh = parseInt(pred.home)
    const ga = parseInt(pred.away)
    if (isNaN(gh) || isNaN(ga)) return

    const home = tabla[match.home_team]
    const away = tabla[match.away_team]

    home.pj++; away.pj++
    home.gf += gh; home.gc += ga
    away.gf += ga; away.gc += gh
    home.dg = home.gf - home.gc
    away.dg = away.gf - away.gc

    if (gh > ga) {
      home.pg++; home.pts += 3
      away.pp++
    } else if (gh < ga) {
      away.pg++; away.pts += 3
      home.pp++
    } else {
      home.pe++; home.pts++
      away.pe++; away.pts++
    }
  })

  // Ordenar: pts → dg → gf → nombre
  return Object.values(tabla).sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.team.localeCompare(b.team)
  )
}

// Verifica si todos los partidos de un grupo tienen predicción
export function grupoCompleto(partidosGrupo, prediccionesJugador) {
  return partidosGrupo.every(m => {
    const p = prediccionesJugador[m.id]
    return p?.home !== undefined && p?.away !== undefined && p.home !== '' && p.away !== ''
  })
}
