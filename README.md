# 🏆 Polla Mundial 2026

App web para quiniela de la Copa del Mundo FIFA 2026 (USA/Canadá/México).

## Stack
- **Frontend**: React + Vite
- **Base de datos**: Supabase (PostgreSQL + Realtime)
- **Deploy**: Vercel / Netlify (cualquiera funciona)

---

## 🚀 Setup en 5 pasos

### 1. Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Crea un nuevo proyecto
3. En el sidebar ve a **SQL Editor**
4. Copia y ejecuta todo el contenido de `supabase_schema.sql`
5. Ve a **Settings > API** y copia:
   - `Project URL` → es tu `VITE_SUPABASE_URL`
   - `anon public` key → es tu `VITE_SUPABASE_ANON_KEY`

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase
```

### 3. Instalar y probar localmente
```bash
npm install
npm run dev
# Abre http://localhost:5173
```

### 4. Deploy en Vercel (recomendado, gratuito)
```bash
npm install -g vercel
vercel
# Sigue las instrucciones y agrega las variables de entorno cuando te las pida
```

O deploy en **Netlify**:
```bash
npm run build
# Sube la carpeta `dist` a Netlify Drop, o conecta el repo
```

### 5. Agregar variables de entorno en el hosting
En Vercel/Netlify agrega:
```
VITE_SUPABASE_URL = https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY = tu_key_aqui
```

---

## 📋 Funcionalidades

| Función | Descripción |
|---------|-------------|
| 🏆 Tabla de posiciones | Ranking en tiempo real con podio |
| ⚽ Partidos | Vista de todos los partidos por grupo |
| 🎯 Predicciones | Ingreso y edición de predicciones por usuario |
| 📋 Reglas | Reglas del juego y sistema de puntos |
| ⚙️ Admin | Panel para ingresar resultados y gestionar todo |

## 🎯 Sistema de puntos (configurable desde Admin)
- **Marcador exacto**: 3 puntos (ej: predijiste 2-1, fue 2-1)
- **Empate correcto**: 2 puntos (predijiste empate y fue empate)
- **Resultado correcto**: 1 punto (acertaste quién ganó)
- **Sin acierto**: 0 puntos

## 👥 Cómo participar
1. Ir a la pestaña **Predicciones**
2. Registrarse con nombre y email
3. Ingresar predicciones antes de que inicien los partidos
4. Ver la tabla de posiciones actualizarse en tiempo real

---

## Estructura del proyecto
```
src/
├── App.jsx                 # App principal, navegación, estado global
├── lib/supabase.js         # Cliente Supabase + función calcularPuntos
├── components/
│   ├── Header.jsx          # Barra superior
│   ├── Leaderboard.jsx     # Tabla de posiciones + podio
│   ├── Matches.jsx         # Vista de partidos
│   ├── Predictions.jsx     # Ingreso de predicciones
│   ├── RegisterParticipant.jsx  # Registro/login
│   ├── Rules.jsx           # Reglas del juego
│   └── AdminPanel.jsx      # Admin: resultados, partidos, config
supabase_schema.sql         # Schema completo de la BD
```
