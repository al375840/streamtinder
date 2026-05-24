---
title: Streamer Tinder — Diseño v1
date: 2026-05-23
status: draft
working_name: twitch-tinder
---

# Streamer Tinder — Diseño v1

Juego interactivo de stream para un canal único de Twitch. Los viewers se apuntan por chat y compiten prediciendo las elecciones del streamer en 10 cartas estilo Tinder (izquierda/derecha). Tras el recuento, el streamer cribra a dedo qué tier sobrevive, con drama narrativo explícito (sin orden estricto, sin undo). El juego mantiene un leaderboard persistente del canal.

## Decisiones clave de diseño

Resumen ejecutivo de cada decisión cerrada durante el brainstorming. Cada una está desarrollada más abajo, esto es un índice.

| Decisión | Elección |
|---|---|
| Plataforma del viewer | Sólo chat de Twitch (sin OAuth, sin web propia) |
| Mecánica del swipe | Simultáneo: streamer y viewers tienen el mismo timer |
| Tenancy | Mono-canal, hardcoded en config |
| Origen de cartas | Packs pre-hechos en el repo, el streamer elige uno por partida |
| Contenido de carta | Imagen + pregunta del pack (subtítulo opcional por carta) |
| Aforo del lobby | Min 10 para arrancar, hard cap 60 visibles |
| Continuidad entre partidas | Sesión persistente + leaderboard global del canal |
| Scoring | 10 pts/acierto + bonus del bote por sobrevivir la criba |
| Bote por partida | Fijo (100 pts), repartido a partes iguales entre supervivientes |
| Mecánica de la criba | 10 columnas verticales, clic libre, sin orden estricto, sin undo |
| Visibilidad bonus durante criba | Sí, recalculado en directo |
| Aviso de voto del streamer | Sí, icono "puede cerrar votación" |
| Control de ritmo | Timer 10s + botón "cerrar votación" tras swipe del streamer |
| Veto de cartas | Sólo botón rojo de emergencia (carta rota), no veto libre |
| Estética | Pixel art retro 8-bit |
| Visibilidad del leaderboard | Overlay tras partida (top de partida) + página pública (global) |
| Stack | .NET 8 + Angular standalone + SignalR + EF Core SQLite |
| Hosting | Azure App Service Basic B1 (~13€/mes) |
| Auth del panel streamer | HTTP Basic auth |
| Anti-cheat | Manual: ban + vaciar lobby desde el panel |

## Flujo del juego

El juego se desarrolla en cinco fases ordenadas. Cada fase tiene su propio renderizado en el overlay público y un set de acciones del streamer en su panel.

### Fase 1 — Lobby

- El streamer pulsa "Abrir lobby" en su panel. El overlay público entra en estado *lobby*.
- En el chat del canal, los viewers escriben `!join` para apuntarse. Su nick aparece como avatar pixel-art en el overlay, con su nick de Twitch encima.
- A cada nick que entra se le asigna un sprite con paleta determinista por hash del nick (mismo nick → mismo sprite), así los regulares se reconocen entre partidas.
- Cuenta atrás de 1 minuto visible en el overlay. Mínimo 10 jugadores apuntados para que se habilite el botón "Empezar partida". Hard cap 60 visibles; el viewer 61+ recibe respuesta por chat (`@user lobby lleno, espera a la próxima`).
- El streamer puede pulsar "Empezar partida" en cualquier momento si tiene mínimo cubierto; no está obligado a esperar al minuto entero.
- Acciones del streamer disponibles: abrir lobby, cerrar lobby, banear nick específico, vaciar lobby (expulsa a todos los apuntados, NO bannea), elegir pack para esta partida.

### Fase 2 — Las 10 cartas (gameplay)

- La partida arranca con el pack seleccionado por el streamer. Un pack tiene `{ name, question, cards[] }` donde `question` se enseña en el overlay durante toda la partida (ej: *"¿Te lo comerías?"*) y `cards` es una lista de `{ id, image, subtitle? }`.
- Las cartas se enseñan **simultáneamente** al streamer (en su panel) y a los viewers (en el overlay) una a una.
- Cada carta tiene timer máximo 10s. Streamer y viewers tienen ese tiempo para decidir izquierda/derecha.
- Los viewers votan por chat: `!izq` o `!der` (alias aceptados: `!l/!r`, `!1/!2`, `!si/!no`). Sólo el primer voto válido por viewer por carta cuenta. Votos posteriores se ignoran.
- El streamer vota en su panel pulsando un botón grande izquierda o derecha. Su voto no se revela al chat aún.
- Caso límite — streamer no vota en 10s: la carta se cancela. Nadie suma puntos por ella. El reveal muestra "Carta sin decisión del streamer". Es responsabilidad del streamer estar atento; no se le fuerza una decisión por timeout.
- Caso límite — `!leave` durante gameplay: ignorado. El viewer está locked-in desde el inicio de la fase 2 hasta el final de la fase 5. `!leave` sólo funciona en `lobby`.
- En cuanto el streamer ha votado (no antes), aparece en su panel un botón "Cerrar votación ahora". El overlay público enseña un icono visible que dice "El streamer ya ha decidido — puede cerrar en cualquier momento". Esto incentiva al chat a votar antes del corte.
- La carta termina cuando: (a) el timer llega a 0, o (b) el streamer pulsa "Cerrar votación ahora". Lo que ocurra primero.
- Tras el cierre se hace un mini-reveal (2-3s) mostrando la elección del streamer y cuántos acertaron.
- Entre carta y carta el streamer controla el ritmo: aparece un botón "Siguiente carta →" que el streamer pulsa cuando quiera comentar. Sin timer en este hueco (los 10s son inviolables sólo durante la carta).
- Si una carta falla técnicamente (imagen no carga tras retry automático), el panel ofrece un botón rojo "Carta rota — saltar" en la esquina inferior derecha, separado del flujo principal. Si se pulsa: la carta se anula, nadie gana puntos por ella, se pasa a la siguiente.

### Fase 3 — Recuento (transición)

- Tras la décima carta, hay una transición de ~5s en la que los avatares de los viewers se reorganizan visualmente desde su posición de lobby a su columna de tier según aciertos (0-10).
- Animación pixel-art: los avatares "saltan" de su posición previa a su columna nueva con un sonido de cling. Total tiempo: ~5s.
- Al terminar, el overlay queda con las 10 columnas verticales pobladas, listas para la criba.

### Fase 4 — Criba (clímax)

- El streamer ve en su panel las 10 columnas, cada una clicable. Encima de cada columna: número de aciertos y cuántos viewers tiene esa columna.
- Mecánica:
    - **Sin orden estricto**: el streamer puede clicar cualquier columna en cualquier orden. Puede salvar al tier 3 y eliminar al tier 8 si quiere. El "salseo" es intencional — genera drama y comentario en chat.
    - **Sin undo**: cada clic es permanente. La eliminación dispara una animación pixel-art (los avatares de esa columna "caen" del overlay) y queda fijada.
    - **Bonus visible**: en una barra inferior del overlay se ve en directo cuántos supervivientes quedan y cuánto bonus le toca a cada uno. Fórmula: `bonus_individual = 100 / supervivientes_actuales`. Cuando el streamer elimina una columna llena, el número sube; cuando elimina una vacía, sólo el contador de supervivientes baja.
- El streamer decide cuándo parar pulsando "Finalizar criba ✓". Lo que queda es el set de ganadores de esta partida.
- No hay regla automática que fuerce eliminar al menos N columnas; el streamer puede no eliminar ninguna (todos ganan algo) o eliminar nueve (sólo un tier sobrevive). Se aplaude la asimetría: la matemática del bote ya regula el incentivo a cortar (cortar concentra el premio).
- Mientras dura la criba, el chat ve todo el proceso en directo y comenta. Esto es contenido por sí mismo, no decisión silenciosa.

### Fase 5 — Reveal y leaderboards

- Tras "Finalizar criba", el overlay enseña en orden:
    1. Confeti pixelado y `N GANADORES` en grande.
    2. Tabla del *leaderboard de partida*: lista de supervivientes con su nick, aciertos, y bonus ganado. Visible durante 15-20s.
    3. Transición a vista de "Próxima partida en…" si el streamer indica que va a abrir otra ronda; si no, vuelve al estado idle.
- En paralelo, el backend hace `UPSERT` en la tabla `scores`: para cada viewer se suma `aciertos * 10 + bonus_ganado` a su acumulado del canal.
- Los viewers pueden consultar el leaderboard global del canal en `https://<dominio>/leaderboard` en cualquier momento. Esa página no requiere login: por defecto muestra top 100, y permite un input "soy `<nick>`" que hace highlight de la fila de ese nick si existe.

## Superficies (UI)

El sistema tiene tres superficies web. Cada una vive en una URL distinta y se sirve desde la misma app .NET.

### Overlay público

- URL: `https://<dominio>/overlay`
- Sin auth. Pensado para meterse como Browser Source en OBS.
- Tamaño nominal 1280×720 (ajustable a la escena del streamer).
- Renderiza la fase actual del juego según el estado servido por SignalR. Estados posibles:
    - `idle` — esperando que el streamer abra un lobby
    - `lobby` — countdown de 1 min, avatares apareciendo, contador `X de Y apuntados`
    - `card` — la carta actual centrada, pregunta del pack arriba, timer visible, indicador "streamer ya votó" cuando aplique
    - `card_reveal` — mini-revelado de 2-3s tras cerrar la votación
    - `tally_transition` — animación de avatares migrando a columnas (5s)
    - `criba` — 10 columnas verticales, eliminaciones en directo, barra de bonus
    - `victory` — confeti + leaderboard de partida
- Conexión SignalR a `/hubs/game` para recibir empujones de estado.

### Panel del streamer

- URL: `https://<dominio>/streamer`
- Auth: HTTP Basic. Credenciales en env vars `STREAMER_PANEL_USER` y `STREAMER_PANEL_PASS`. Middleware custom de ASP.NET Core valida `Authorization: Basic <base64(user:pass)>` y devuelve 401 + `WWW-Authenticate: Basic realm="..."` en su ausencia.
- Renderiza también según fase, con controles específicos cada una:
    - `idle` — botón grande "Abrir lobby" + selector de pack (dropdown con los packs disponibles)
    - `lobby` — lista de viewers apuntados + botones "Empezar partida", "Banear", "Vaciar lobby", "Cerrar lobby". El botón "Empezar partida" está disabled hasta tener ≥10.
    - `card` — la carta actual + dos botones gigantes "← Izquierda" y "Derecha →". Tras el voto, aparece botón "Cerrar votación ahora". Esquina inferior derecha: botón rojo "Carta rota — saltar".
    - `card_reveal` — botón "Siguiente carta →" cuando el streamer quiera continuar.
    - `criba` — vista réplica del overlay (10 columnas clicables) + botón "Finalizar criba ✓".
    - `victory` — botón "Abrir nuevo lobby" para seguir o "Cerrar sesión" para terminar.

### Página de leaderboard pública

- URL: `https://<dominio>/leaderboard`
- Sin auth.
- Renderiza top 100 ordenado por puntos totales del canal.
- Input "soy `<nick>`" que hace highlight de la fila de ese nick (client-side, no se persiste nada). Si el nick está fuera del top 100, muestra su fila aparte con su posición exacta.
- Soporta deep-linking: `/leaderboard?highlight=adri_42` (útil para que el streamer comparta enlace en su chat).

## Visual design

- **Estética**: pixel art retro 8-bit. Paleta limitada y saturada por pack (cada pack puede traer su paleta para diferenciarse visualmente: pack "Pizzas" con tonos cálidos, pack "RPGs clásicos" con púrpuras y verdes, etc.).
- **Tipografía**: fuente pixel (`Press Start 2P` o `m5x7` vía web font). Tamaño consistente entre overlay y panel.
- **Avatares**: sprite de ~24×30 píxeles por viewer. Estructura: cabeza (color piel del set), cuerpo (color random determinista por hash del nick), pose (1 de 4-6 poses aleatorias también deterministas por hash). El nick de Twitch en una mini-etiqueta encima del sprite.
- **Animaciones**: frame-by-frame sin easing. Avatares "saltan" en lugar de deslizarse. Las eliminaciones en la criba son una caída por gravedad pixelada con sonido de "crash" (visual, sin audio en v1).
- **Sin audio en v1**. El overlay es un Browser Source y el audio-vía-browser-en-OBS es problemático. Si se decide meter audio, va en v2 con configuración explícita del streamer.

## Modelo de datos

SQLite con EF Core. Tablas:

```
packs
    id (text, PK)            -- ej: "pizza-toppings"
    name (text)              -- ej: "Pizza Toppings"
    question (text)          -- ej: "¿Te lo comerías?"
    palette_primary (text)   -- hex, opcional
    palette_accent (text)    -- hex, opcional

cards
    id (text, PK)            -- ej: "pizza-toppings-01"
    pack_id (text, FK)
    image_path (text)        -- relativo a /wwwroot/assets/packs/
    subtitle (text, nullable)
    order_index (int)        -- orden por defecto, aunque se barajan por partida

games
    id (text, PK)            -- guid
    pack_id (text, FK)
    started_at (datetime)
    ended_at (datetime, nullable)
    streamer_username (text) -- denormalizado para consultas históricas
    status (text)            -- 'lobby', 'playing', 'criba', 'finished', 'cancelled'

game_participants
    game_id (text, FK)
    twitch_username (text)
    joined_at (datetime)
    final_score (int)        -- aciertos en esa partida (0-10)
    survived_criba (bool)
    bonus_earned (int)
    PRIMARY KEY (game_id, twitch_username)

votes
    game_id (text, FK)
    card_id (text, FK)
    twitch_username (text)
    direction (text)         -- 'left' | 'right'
    voted_at (datetime)
    PRIMARY KEY (game_id, card_id, twitch_username)

scores
    twitch_username (text, PK)  -- global por canal mono-tenant
    total_points (int)
    games_played (int)
    games_won (int)              -- supervivencias a la criba
    last_played_at (datetime)

bans
    twitch_username (text, PK)
    banned_at (datetime)
    reason (text, nullable)
```

Notas:
- `votes` se usa principalmente durante la partida para calcular resultados; se podría purgar tras unas semanas si pesa demasiado. Para v1 no se purga.
- `scores` es la fuente del leaderboard global. Se actualiza con `UPSERT` al finalizar cada partida en una transacción.
- No hay tabla `users`: el nick de Twitch es identidad. No se valida que sea único entre humanos distintos.

## Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│                Azure App Service (Linux, .NET 8)                 │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │ ASP.NET Core host                                        │   │
│   │                                                          │   │
│   │   /  (static files: Angular SPA wwwroot)                 │   │
│   │   /streamer  (Angular route, gated by Basic auth)        │   │
│   │   /leaderboard (Angular route)                           │   │
│   │   /hubs/game (SignalR hub)                               │   │
│   │   /api/* (REST mínimo: leaderboard query)                │   │
│   │                                                          │   │
│   │   Hosted services (background):                          │   │
│   │     - TwitchChatService (TwitchLib anonymous IRC)        │   │
│   │     - GameOrchestrator (state machine, timers)           │   │
│   │                                                          │   │
│   │   Persistence: EF Core + SQLite at /home/data/game.db    │   │
│   └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
        ▲                          ▲                          ▲
        │                          │                          │
        │ HTTPS                    │ WSS (SignalR)            │ IRC
        │                          │                          │
   ┌────┴───────┐         ┌────────┴──────┐         ┌────────┴────────┐
   │ Viewers    │         │ OBS browser   │         │ Twitch IRC      │
   │ (chat only)│         │ source +      │         │ (anonymous,     │
   │            │         │ streamer panel│         │  read public    │
   │            │         │ (browser)     │         │  chat of canal) │
   └────────────┘         └───────────────┘         └─────────────────┘
```

- **Backend** .NET 8 ASP.NET Core, single process.
- **Frontend** Angular standalone con signals, servido como static files desde `/wwwroot` por el mismo proceso.
- **Realtime** SignalR hub `/hubs/game`. Pub/sub. El overlay y el panel se conectan al hub y reciben empujones de estado. El panel también invoca métodos del hub para acciones del streamer (`StartLobby`, `VoteCard`, `EliminateColumn`, etc.).
- **Twitch IRC** TwitchLib en un hosted service que arranca al levantar la app. Lee chat del canal hardcoded en config, parsea comandos `!join`, `!leave`, `!izq`, `!der` y variantes. No escribe al chat en v1.
- **Game state** vive en memoria en `GameOrchestrator` (singleton). Se persiste al final de cada partida en SQLite. Si la app se reinicia mid-game, la partida en curso se pierde (aceptable en v1 — la cadencia de partidas es de 5-7 min, basta con que el streamer abra otra).
- **DB** SQLite via EF Core. Migraciones aplicadas al startup (`MigrateAsync`). Archivo en `/home/data/game.db`, montado en el storage persistente de App Service.

## Integración Twitch

- **Lectura de chat**: conexión IRC anónima al canal `<channel>` configurado en `appsettings.Production.json`. No requiere registrar app en dev.twitch.tv para v1.
- **Comandos parseados** (case-insensitive):
    - `!join` → apunta al lobby si está abierto y el nick no está baneado
    - `!leave` → desapunta del lobby actual
    - `!izq`, `!l`, `!1`, `!si` → voto izquierda en carta activa
    - `!der`, `!r`, `!2`, `!no` → voto derecha en carta activa
    - `!rank` → reservado para v2 (responder con la posición del nick)
- **Reconexión**: TwitchLib reconecta automáticamente. Si la conexión cae mid-game, los votos se pierden durante el hueco; al volver, se sigue donde quedó.
- **Sin escritura al chat en v1**. Si se quiere v2, registrar cuenta de bot + OAuth + scope `chat:edit`.

## Deployment

### Hosting

- **Azure App Service Basic B1**, Linux, .NET 8 runtime stack.
- `AlwaysOn = true` (crítico para mantener el bot conectado).
- `WebSocketsEnabled = true`.
- HTTPS gratis con cert gestionado por Azure.
- Custom domain opcional (si no, `https://<app>.azurewebsites.net`).

### Storage persistente

- `/home/data/game.db` para SQLite.
- `/home` persiste entre deploys y restarts por defecto en App Service Linux.
- Backups automáticos del DB: un job nocturno que copia `game.db` a `/home/data/backups/YYYY-MM-DD.db` y rota a 7 días (en v1 se puede hacer con un Hosted Service simple).

### Secrets

- `STREAMER_PANEL_USER`, `STREAMER_PANEL_PASS` → credenciales Basic auth del panel.
- `TWITCH_CHANNEL` → nick del canal de Twitch a escuchar.
- `TWITCH_BOT_NICK` → nick anónimo para la conexión IRC (`justinfan<random>` funciona).

Todas en App Service > Configuration > Application Settings.

### CI/CD

- GitHub Actions workflow `.github/workflows/deploy.yml`.
- Triggers: push a `main`.
- Jobs:
    1. `build` — `dotnet restore`, `dotnet build --configuration Release`, `npm ci && ng build --configuration production` dentro del subproyecto Angular.
    2. `test` — `dotnet test` (cuando haya tests).
    3. `deploy` — sólo en `main`, usa `azure/webapps-deploy@v3` con publish profile guardado como GitHub Secret `AZURE_PUBLISH_PROFILE`.
- Tiempo de deploy estimado: 3-5 min push a producción.

### Costes esperados

- App Service B1: ~13€/mes (flat, no varía con tráfico esperado de un canal único)
- Dominio custom: ~10€/año (opcional)
- Total: **~13-14€/mes**

## Scoring (detalle)

Por cada partida finalizada:

1. Por cada acierto (voto del viewer coincide con voto del streamer en esa carta): **+10 pts** al `total_points` del viewer.
2. Por sobrevivir la criba (la columna del viewer no fue eliminada): **+bonus** donde `bonus = floor(100 / supervivientes_count)`. Si quedan 1 superviviente, +100. Si quedan 25, +4 cada uno.
3. Se incrementan `games_played` para todos los participantes y `games_won` sólo para los supervivientes.

Persistencia: una transacción de EF Core al finalizar la fase 5 que hace UPSERT por participante.

## Fuera de scope para v1

Apuntado explícitamente como "no construimos esto ahora" para evitar scope creep:

- Twitch OAuth (login de viewers o del streamer)
- Predicciones nativas de Twitch (channel point predictions)
- Channel point redemptions
- Bot que escribe en el chat (anuncios, replies a `!rank`)
- Multi-canal / multi-streamer
- Subida de packs custom por el streamer (panel admin)
- Submissions de cartas por comunidad
- Mobile-first viewer UI (no aplica porque el viewer no abre web)
- Sonido en el overlay
- Internacionalización del UI
- Tests E2E (los unitarios y de integración sí están en scope cuando se construya)
- Anti-cheat automatizado (limit-rate por nick, detección de bursts, etc.)

## Riesgos y notas

- **Anti-cheat manual**. Multi-cuenta es posible. Mitigación = el streamer banea desde el panel cuando ve cosas raras. Aceptado para v1 dado el contexto (stream íntimo del canal, no torneo competitivo).
- **Pérdida de partida en restart**. Si la app se reinicia durante una partida, la partida actual se pierde porque el estado vive en memoria. Mitigación = el streamer abre otra. La continuidad del leaderboard se preserva porque los UPSERT son por partida-cerrada, no por carta.
- **Salseo intencional**. La combinación "sin orden estricto" + "sin undo" en la criba es deliberada. El sistema de scoring está diseñado para que los aciertos individuales (+10/cada uno) sobrevivan a cualquier capricho del streamer; sólo el bonus está a su antojo. Esto preserva el mérito del viewer skillado independientemente del personaje del streamer.
- **Basic auth en producción**. Es suficiente para mono-tenant + un solo usuario humano (tú). Si el secret se filtra, rotación = cambiar env var + restart (~30s).
- **Hard cap 60 visibles**. Aceptamos la decisión que tomamos (hard cap, no soft cap). El viewer 61+ se entera por reply manual del streamer ("lo siento, lobby lleno"). En v2 se puede revisitar con un canvas que aguante más sprites o con scroll vertical en el lobby.

## Detalles diferidos a implementación

Cosas decididas en concepto pero cuyos valores exactos quedan para la implementación:

- Nombre definitivo del proyecto (working name: `twitch-tinder`).
- Canal de Twitch a escuchar (config).
- Packs concretos para v1 (sugerencia: 3-5 packs temáticos shipped en el repo: "Pizza Toppings", "RPGs Clásicos", "Comida Asquerosa", "Famosos Españoles", "Memes 2010-2020").
- Algoritmo exacto de hash → paleta de avatar (sugerencia: `xxhash(nick) % palette_count` con paleta fija de 8-16 colores corporales).
- Valores exactos de scoring (10 pts/acierto, 100 pts de bote por partida — son configurables, los dejamos así por defecto).
- Tamaño y proporción concreta del overlay y del panel.
- Sprites concretos de los avatares (cartoon set base + variaciones de pose).
