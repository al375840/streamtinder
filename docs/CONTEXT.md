# Streamer Tinder — Contexto de trabajo

> Documento vivo para orientar a cualquier sesión de Claude Code (incluida la del móvil
> vía Remote Control). Resume QUÉ es el proyecto, CÓMO funciona lo no-obvio, y DÓNDE
> estamos. Si algo aquí ya no cuadra con el código, el código manda — avisa y se actualiza.

## Qué es

Minijuego para streams de Twitch de un solo canal. El streamer ve cartas (juegos,
pokémons, comida…) y vota izquierda/derecha según su criterio personal; el chat vota a
la vez con `!izq` / `!der`. Aciertan los espectadores que coinciden con el streamer. Al
final hay una "criba" teatral donde el streamer elimina tramos de aciertos y los
supervivientes se reparten un bonus. Leaderboard global persistente.

Objetivo del autor (Adrián): pieza de portfolio + herramienta gratis para streamers
hispanos. Quiere enseñarlo y eventualmente postearlo en LinkedIn.

## Repo y despliegue

- **GitHub:** https://github.com/al375840/streamtinder · branch `main` (push directo, sin PRs)
- **Hosting:** Azure App Service, West Europe
- **URL prod:** https://streamer-tinder-dvfugrewg9abe8h8.westeurope-01.azurewebsites.net/
  - `/overlay` — vista para OBS (pública, solo lectura)
  - `/streamer` — panel de control (Basic Auth)
  - `/streamer?dev=1` — panel con MODO TEST (bots + auto-voto)
  - `/leaderboard`, `/packs`
- **Credenciales demo:** `tomate` / `patata` (en Azure App Settings: `StreamerPanel:User` / `StreamerPanel:Pass`)
- **CI/CD:** push a `main` → deploy automático (~3-6 min).

## Stack

| Capa | Tech |
|---|---|
| Frontend | Angular standalone + signals, sin SSR |
| Backend | .NET 8 minimal API + SignalR |
| Persistencia | EF Core + SQLite (`App_Data/game.db`) |
| Twitch | TwitchLib en `TwitchChatService` (HostedService) |
| Hosting | Azure App Service (no Static Web Apps — hace falta SignalR) |

**No es Clean Architecture** — proyecto pequeño, un solo `.csproj` en `apps/api`. No
refactorizar a Clean salvo petición explícita; para el tamaño actual no compensa.

## Layout

```
apps/
├── api/                       # .NET 8
│   ├── Domain/                # GameState, Pack, Card, ChatCommand, VoteDirection,
│   │                          #   GamePhase, BotNicks, Persisted* (entidades EF)
│   ├── Services/              # GameOrchestrator, PackRepository, ChatCommandParser,
│   │                          #   TwitchChatService, SignalRGamePublisher
│   ├── Hubs/GameHub.cs         # SignalR hub (todos los métodos cliente↔servidor)
│   ├── Endpoints/              # Minimal API (LeaderboardEndpoints)
│   ├── Infrastructure/         # BasicAuthMiddleware, BasicAuthValidator,
│   │                          #   StreamerSessionService, AppDbContext, *Options
│   ├── Packs/*.json            # Definiciones de packs (cargadas al arrancar)
│   └── wwwroot/                # Salida del build Angular (gitignored)
└── web/                       # Angular SPA
    ├── src/app/streamer/       # Panel del streamer (controls-*.component.ts)
    ├── src/app/overlay/        # Overlay para OBS (phases/phase-*.component.ts)
    ├── src/app/ui/sprite/      # SpriteEngine (muñecos pixel deterministas por nick)
    └── src/app/core/           # SignalRService, GameStateStore, ExtendingTimer, types
```

## Cómo arrancar en local

```bash
# Backend (sirve también el frontend ya compilado desde wwwroot)
cd apps/api && dotnet run

# Frontend en modo watch (build a apps/api/wwwroot)
cd apps/web && npx ng build --configuration=development --watch
```

Build de comprobación frontend: `cd apps/web && npx ng build --configuration=development`
Build backend: `dotnet build apps/api/StreamerTinder.Api.csproj`

## Cómo funciona lo no-obvio

### Autenticación (cookie-bridge HTTP↔WebSocket)
El panel `/streamer` va con HTTP Basic Auth. Pero el SignalR Hub también necesita saber
quién es el streamer, y **los navegadores no pueden poner headers en el upgrade de
WebSocket**. Solución:
1. `BasicAuthMiddleware` protege `/streamer*`, valida con `BasicAuthValidator` (timing-safe,
   `CryptographicOperations.FixedTimeEquals`).
2. Tras login OK, setea una cookie HTTP-only `st_ses` (token random por arranque) vía
   `StreamerSessionService`.
3. `GameHub.OnConnectedAsync` lee esa cookie (las cookies sí viajan en el WS upgrade) y
   marca `Context.Items["IsStreamer"]`.
4. Cada método de mutación del hub llama a `EnsureStreamer()` → `HubException("Unauthorized")`
   si no hay marca.

### GameOrchestrator
Singleton con `SemaphoreSlim(1,1)` que serializa todas las mutaciones. El estado
(`GameState`, record inmutable en Domain) se transforma con métodos puros (`Join`,
`OpenLobby`, `StartGame`, `CloseCard`, `NextCard`, `EliminateTier`, `FinalizeCriba`…).
El orquestador solo hace locking + publish vía `IGameStatePublisher` (SignalR).

### Fases
`Idle → Lobby → Card → CardReveal → (loop) → TallyTransition → Criba → Victory → Idle/Lobby`.
La transición `TallyTransition → Criba` es automática tras 5s (fire-and-forget que usa
`CancellationToken.None` a propósito — usar el ct del caller cancelaba la transición).

### Cartas: 10 aleatorias por partida
`GameState.CardsPerGame = 10`. `OpenLobbyAsync` baraja el pack y se queda con 10 (o menos
si el pack tiene menos). Packs de 30 (Nintendo, Pokémon Gen 4) → 10 random distintas cada
partida. Eeveelutions (9) → las 9 barajadas.

### Modo TEST (`?dev=1`) — activo TAMBIÉN en producción
- `GameHub.DevAddFakePlayers(count)` — inyecta bots (`bot_xxxx_i`)
- `GameHub.DevAutoVote(leftBiasPercent)` — votos random de los que aún no han votado
- Protegido por `EnsureStreamer()` (solo el streamer logueado). UI escondida sin `?dev=1`.
- Los bots usan `BotNicks.Prefix = "bot_"` y se **filtran al persistir** (`PersistGameAsync`)
  y al leer el leaderboard → no ensucian stats reales.

### Overlay: avatares deambulando (roamers)
En fase `card`, `RoamersService` dibuja en un **canvas único** (no DOM por muñeco) los
avatares de los jugadores. Tres zonas: NO (izq), undecided (centro), SÍ (der). Al votar,
el muñeco migra a su zona y deambula errático. Detalles:
- Cap a **20 muñecos** visibles (muestreo aleatorio del lobby; el resto vota y cuenta en
  los contadores grandes pero no se dibuja).
- Nicks en **píldora oscura** legible (no outline).
- Esquivan el pie de la carta (título/subtítulo) vía `maxYAt(x)`.

### Contadores que nunca llegan a 0
`core/extending-timer.ts`: cuando el contador de carta (o lobby) iría a 0:00, suma
segundos extra (+3 carta, +5 lobby) y muestra una badge `+Ns` con animación pixel. Es
**solo frontend** — los timers del servidor son cosméticos (las fases solo avanzan por
acción del streamer).

## Packs actuales
- `nintendo-clasicos` (display "Nintendo Moderno") — 30 cartas DS/Wii/Switch/Switch2
- `pokemon-gen4` — 30 cartas Gen 4 con sprites
- `eeveelutions` — 9 cartas (Eevee + 8 evoluciones)
- (hay más, ej. comida) — ver `apps/api/Packs/*.json`
- Default al abrir lobby: `nintendo-clasicos`.

## Constantes del juego (`Domain/GameState.cs`)
`LobbyMin=3`, `LobbyMax=60`, `CardSeconds=10`, `LobbySeconds=60`, `BonusPool=100`,
`PointsPerHit=10`, `CardsPerGame=10`.
⚠ Si cambias `LobbyMin`, sincroniza el frontend a mano: `controls-lobby.component.ts`
tiene el `3` y "mínimo 3 jugadores" hardcoded.

## Seguridad (no re-introducir bugs ya resueltos)
- `EnableDetailedErrors` solo en Development (filtraba stack traces en prod).
- Inputs validados en el hub: `packId` (alfanum + `-_`, ≤64), `nick` (alfanum + `_`, ≤25),
  `direction` ("left"/"right"), `tier` (0..10).
- Leaderboard: `offset` clamp ≥0, `limit` clamp [1,200], nick validado.
- Excepciones del dominio → `HubException(msg)` para que el frontend las muestre.
- Sin secrets hardcoded. `.gitignore` protege appsettings.*.json, secrets, certs, etc.

## Favicon
`apps/web/src/favicon.svg` — corazón pixel oxblood→flame. Se eliminó el `favicon.ico`
default de Angular (causaba que la pestaña mostrara la "A"). `index.html` lo referencia
con `?v=3` para saltarse el caché.

## Pendientes / ideas conocidas
- Animaciones overlay sin hacer: card flip 3D al cambiar carta, count-up de votos al
  cerrar carta, caída con shake de tiers en criba, confetti en victory.
- Playground frontend-only para iterar animaciones sin backend (discutido, no hecho).
- Roamers v2: que un voto de un no-mostrado sustituya a un undecided mostrado, para que
  la muestra visible refleje la distribución real de votos.
- Dominio custom + plan Azure: discutido (B1 ~13€/mes vs migrar frontend a Static Web Apps).

## Convención de commits
Conventional Commits (`feat`, `fix`, `refactor`, `security`, `chore`, `docs`). Mensajes en
inglés, explican el *por qué*. Co-Authored-By al final.
