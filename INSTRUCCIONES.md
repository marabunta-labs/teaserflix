# Instrucciones — menú secreto y nuevo algoritmo

Lo que tienes que hacer tú para que todo funcione. El código ya está escrito.

## 1. Instalar dependencias (1 vez)

```bash
cd frontend
npm install
```

Se ha añadido `qrcode.react` (para el QR).

## 2. Crear las tablas nuevas en Supabase (obligatorio para "Sesión de grupo")

1. Abre tu proyecto en Supabase → **SQL Editor**.
2. Copia **solo el bloque final** de `database/schema.sql`, el que empieza por
   `-- SECRET MENU — GROUP SWIPE SESSIONS ("party")`.
3. Pega y pulsa **Run**.

Crea `party_sessions`, `party_participants` y `party_votes` con RLS abierta a
usuarios anónimos (los invitados no tienen cuenta). Si ya ejecutaste el
schema completo antes, no vuelvas a lanzarlo entero: solo ese bloque.

> El Adivino no necesita nada de Supabase. Y el algoritmo nuevo no requiere
> cambios en la base de datos.

## 3. Arrancar y probar

```bash
npm run dev
```

**Entrar al menú secreto:** toca el logo "Teaserflix" (arriba a la izquierda del
feed) **7 veces seguidas** y rápido.

### Probar el Adivino
`/secret` → *El Adivino* → contesta las preguntas.

### Probar la sesión de grupo
1. `/secret` → *Sesión de grupo* → elige filtros → *Crear sesión*.
2. Sale el QR. **Para escanearlo con el móvil, el móvil debe poder abrir la URL
   del QR**:
   - En local, `localhost` no vale desde otro dispositivo. Abre la app en el
     ordenador con la IP de tu red (p. ej. `http://192.168.1.20:3000/secret`) y
     arranca con `npm run dev -- -H 0.0.0.0`. Móvil y ordenador en la misma wifi.
   - O prueba directamente en producción (Vercel).
3. Escanea con 2+ móviles, deslizad, y mira los matches en vivo en la pantalla
   del anfitrión (se refresca cada ~2,5 s).

## 4. Despliegue

Nada especial: al hacer push a `main`, Vercel despliega. Las variables de
entorno son las mismas (`TMDB_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Qué cambió en el algoritmo de recomendación

Archivo principal: `frontend/lib/recommender.ts` (y `fetchBatch` en `app/page.tsx`).

- **Gusto = reacción media por género, no suma.** Antes un género que ves mucho
  ganaba solo por volumen, aunque lo saltaras. Ahora cuenta cómo reaccionas
  *cuando aparece*, con un suavizado para no fiarse de 1 sola muestra.
- **Scroll rápido penaliza de verdad.** <2 s = -6 (antes -5), 2-5 s = -2.
  Las pelis que saltas dejan de empujar su género.
- **Géneros evitados.** Si saltas un género repetidamente (3+ veces y afinidad
  ≤ -2) se excluye de las recomendaciones (`without_genres`) y se filtra del feed.
- **"Más como lo que te gustó".** Hasta el 45 % del feed viene de las
  recomendaciones de TMDB basadas en pelis que diste like, guardaste o viste
  entera.
- **Un like cuenta una sola vez y se guarda.** Antes el like se contaba doble
  en local y, por un bug de orden, la fila guardada en Supabase decía
  "no interesado" (el `update` se ejecutaba antes de que existiera la fila).
  Ahora, al salir de la tarjeta, se guarda como interesado si le diste like o
  la guardaste.
- **Se usan tus likes y watchlist anteriores.** Al cargar el historial se leen
  también las tablas `likes` y `watchlist`, que antes se ignoraban.
- **Olvido gradual.** Las reacciones pierden peso con el tiempo (vida media de
  30 días, mínimo 15 %).
- **Más variedad y calidad.** Descubrimiento por género con nota ≥ 6, alternando
  un género favorito o una pareja; 15 % de exploración (trending/popular).

Notas: los usuarios sin cuenta también se benefician dentro de la sesión, pero
su gusto no se guarda entre visitas (solo las pelis ya vistas). Las filas ya
guardadas con `is_interested = false` por el bug anterior no se corrigen
solas; los likes antiguos se recuperan desde la tabla `likes`.
