# Handoff: Streamer Tinder · dirección visual v0.2

Mock-ups de alta fidelidad para el juego de stream **Streamer Tinder** (canal único de Twitch, mono-tenant). Estética pixel art retro 8-bit. Aprobado por el product owner el 2026-05-24.

---

## 1 · Sobre estos archivos

Los archivos en `prototypes/` son **referencias de diseño** construidas en HTML/CSS/JS plano. **No son código de producción que se copie tal cual.**

La tarea es:

1. Leer el spec funcional en `spec/2026-05-23-streamer-tinder-design.md` (fuente de verdad de mecánicas, modelo de datos, arquitectura).
2. Recrear cada superficie HTML en el stack acordado:
   - **Frontend:** Angular 17+ standalone + signals + SCSS + `image-rendering: pixelated`
   - **Backend:** ASP.NET Core 8 + SignalR + EF Core + SQLite
3. Mantener los **design tokens, paleta, tipografía, motor de sprites y animaciones** del prototipo — pero usar los patterns/conventions del codebase Angular real (componentes standalone, services, signals para state).

**Fidelidad: HI-FI.** Colores hex, tamaños en px, timings y `steps()` están todos canónicos en `prototypes/assets/tokens.css`. Copiar literalmente al SCSS de Angular.

---

## 2 · Stack y arquitectura

Está todo en el spec, pero el resumen para no tener que abrirlo:

```
ASP.NET Core (Linux, .NET 8) en Azure App Service B1
├── /              → SPA Angular (wwwroot)
├── /overlay       → ruta Angular sin auth, browser-source de OBS
├── /streamer      → ruta Angular con HTTP Basic auth
├── /leaderboard   → ruta Angular sin auth, soporta ?highlight=<nick>
├── /hubs/game     → SignalR hub (estado del juego push)
├── /api/*         → REST mínimo (query del leaderboard)
└── hosted services:
    ├── TwitchChatService    (TwitchLib IRC anónimo, lee chat)
    └── GameOrchestrator     (state machine + timers, singleton)
```

State del juego vive en memoria en `GameOrchestrator`. SQLite persiste sólo al finalizar partida. WebSockets activados.

---

## 3 · Las 7 fases del juego

El sistema es una máquina de estados lineal. Cada fase tiene render en `/overlay` y `/streamer`.

| # | Fase | Spec | Overlay enseña | Panel controla |
|---|---|---|---|---|
| 0 | `idle` | Esperando | "STAND BY" + pacers bobbing | Pack selector + "Abrir lobby" |
| 1 | `lobby` | Apuntarse con `!join` | Avatares en grid, countdown 1 min, min 10/cap 60 | Lista de apuntados, botones empezar/banear/vaciar |
| 2 | `card` | Una de 10 cartas Tinder | Carta centrada + pregunta del pack + timer 10s + affordances `!izq`/`!der` | Imagen + 2 botones gigantes swipe + cerrar votación + "Carta rota" emergency |
| 3 | `card_reveal` | Mini-reveal 2-3s | Pick del streamer + aciertos count | Solo "Siguiente carta →" (sin timer) |
| 4 | `tally_transition` | Migración 5s tras la 10ª carta | Avatares saltan a su tier (0-10 aciertos) | Sin controles (esperar animación) |
| 5 | `criba` | Streamer elimina tiers libremente | 11 columnas clicables + bonus en directo | Grid de 11 mini-cols + "Finalizar criba ✓" |
| 6 | `victory` | Confeti + tabla | "¡N GANADORES!" + tabla top con +pts | "Abrir nuevo lobby" / "cambiar pack" / "cerrar sesión" |

Ver `prototypes/overlay.html` (selector de fase arriba) y `prototypes/streamer.html` (pestañas de fase) para inspeccionar cada una en vivo.

---

## 4 · Paleta — 32 colores con rol funcional

Todos están en `prototypes/assets/tokens.css` como custom properties. Copiar literal:

### Voids & paper (text + backgrounds)
```scss
--c-void:    #0a0612;   // deepest background (shadows, outlines)
--c-night:   #1a1428;   // primary bg del overlay
--c-dusk:    #2c2440;   // panel bg
--c-stone:   #4a3a6a;   // dividers, low-priority text
--c-ash:     #7a6a99;   // secondary text
--c-bone:    #d9d2e8;   // primary text on dark
--c-paper:   #f6f0ff;   // highlight / win text
--c-pure:    #ffffff;
```

### Brand accents
```scss
--c-flame:    #ff3c8b;  // PRIMARY · botones, bordes destacados, voto streamer
--c-flame-dk: #b81e63;
--c-ice:      #4ad4d4;  // SECONDARY · info
--c-ice-dk:   #1f7a8a;
```

### Tiers (podio, ganador final, pulse "streamer ya votó")
```scss
--c-gold:    #ffd33d;
--c-silver:  #b8c4d4;
--c-bronze:  #c97a3a;
```

### Alerts
```scss
--c-danger:    #ff5b5b;  // eliminados criba, "carta rota", voto izq (NO)
--c-danger-dk: #8a1f1f;
--c-warn:      #ff9b3d;
--c-success:   #5fde6f;  // confirmación, voto der (SÍ), supervivientes
--c-success-dk:#1f7a3a;
```

### Cuerpos de avatar (8) — `BODY_COLORS` en `sprite.js`
```scss
--c-body-1: #ff3c8b;  // pink
--c-body-2: #4ad4d4;  // cyan
--c-body-3: #5fde6f;  // green
--c-body-4: #ffd33d;  // yellow
--c-body-5: #c97aff;  // purple
--c-body-6: #ff8a3d;  // orange
--c-body-7: #6a8aff;  // blue
--c-body-8: #ffffff;  // white
```

### Skin tones (4) — `SKIN_COLORS`
```scss
#ffd5b0, #e8a878, #a06a3a, #5a3a1f
```

### Hair tones (6) — `HAIR_COLORS`
```scss
#2a1810 (black), #6b3a1a (brown), #d4a23d (blonde),
#b8341f (red), #4a4a6a (grey), #ff3c8b (anime pink)
```

**Reglas:**
- Cero gradientes en el producto final. Sólo `repeating-linear-gradient` permitido como textura de placeholder/pattern.
- Cero `box-shadow` con blur. Sólo sombras stepped (ver tokens más abajo).
- Cero `filter: blur()`.

---

## 5 · Tipografía

Dos fuentes Google Fonts:

```scss
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

--font-title: 'Press Start 2P', monospace;  // titulares, botones, etiquetas, números grandes
--font-body:  'VT323', monospace;            // cuerpo, listas largas, chat, descripciones
```

`font-smoothing: none` y `-webkit-font-smoothing: none` GLOBALES — el pixel art no debe anti-aliasear.

### Escala
| Token | px | Uso |
|---|---|---|
| `--fs-mega` | 48 | hero, victory |
| `--fs-xl` | 32 | títulos de fase |
| `--fs-lg` | 24 | títulos de carta, contadores grandes |
| `--fs-md` | 16 | PS2P body |
| `--fs-sm` | 12 | PS2P captions |
| `--fs-xs` | 8 | PS2P tiny labels (nick bajo avatar, etc.) |
| `--fs-body-lg` | 28 | VT323 cuerpo destacado |
| `--fs-body` | 22 | VT323 default |
| `--fs-body-sm` | 18 | VT323 caption |

PS2P abajo de 8px es ilegible — nunca usar.

---

## 6 · Grid 8×8 + escalado de sprites

Toda dimensión, padding, posición y gap debe ser **múltiplo de 8** (excepto píxeles dentro del sprite, que son 1px nativo). Esto garantiza pixel-perfect en cualquier escalado entero.

```scss
--u-half: 4px;
--u: 8px;       // unidad base
--u2: 16px;
--u3: 24px;
--u4: 32px;
--u6: 48px;
--u8: 64px;
```

### Sprite nativo: 24×30 px
Renderizado en `<canvas width="24" height="30">` a tamaño nativo, escalado por CSS con `image-rendering: pixelated`.

**Reglas de escala (aprobadas):**

| Superficie | Escala | Tamaño visible | Razón |
|---|---|---|---|
| Lobby (overlay) | ×2 | 48×60 | Caben 60 avatares sin solaparse |
| Tally/Criba | ×2 (lo modifiqué de ×3) | 48×60 | 11 columnas en 1280px requiere columnas estrechas |
| Card reveal | ×3 | 72×90 | Sprite del streamer reconocible |
| Victory podio | ×6 | 144×180 | Ganador es el héroe |
| Leaderboard listado | ×2 | 48×60 | Filas densas |
| Panel streamer thumbs | ×1.5 | 36×45 | Identificación rápida en grid |

---

## 7 · Tokens de borde y sombra

```scss
--border-1: 2px;     // dividers, cards menores
--border-2: 4px;     // cards principales
--border-3: 6px;     // hero, ganador

// stepped shadows — sin blur jamás
--shadow-pixel:
  3px 0 0 var(--c-void),
  0 3px 0 var(--c-void),
  3px 3px 0 var(--c-void);

--shadow-pixel-lg:
  6px 0 0 var(--c-void),
  0 6px 0 var(--c-void),
  6px 6px 0 var(--c-void);

// inset bevels
--bevel-up:
  inset 3px 3px 0 0 rgba(255,255,255,.25),
  inset -3px -3px 0 0 rgba(0,0,0,.45);

--bevel-down:
  inset -3px -3px 0 0 rgba(255,255,255,.25),
  inset 3px 3px 0 0 rgba(0,0,0,.45);
```

---

## 8 · Motor de sprites — `prototypes/assets/sprite.js`

Algoritmo determinista nick → sprite. **Crítico portar exactamente para que un mismo nick produzca siempre el mismo sprite.**

### Hash (djb2)
```js
function hashNick(nick) {
  let h = 5381 >>> 0;
  const s = String(nick || '').toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
```

**Importante:** `>>>` unsigned, no `>>` signed — con `>>` los hashes grandes (> 2^31) generan índices negativos en JS.

### Asignación
```js
function spriteFor(nick, packPalette) {
  const h = hashNick(nick);
  const palette = packPalette || BODY_COLORS;
  return {
    body:  palette[h % palette.length],
    skin:  SKIN_COLORS[(h >>> 3) % SKIN_COLORS.length],
    hair:  HAIR_COLORS[(h >>> 6) % HAIR_COLORS.length],
    pants: PANTS_COLORS[(h >>> 9) % PANTS_COLORS.length],
    pose:  POSES[(h >>> 12) % POSES.length],
    hasHat: ((h >>> 15) & 1) === 1,
  };
}
```

Cuando el `packPalette` se pasa, sustituye `BODY_COLORS` — el sprite cambia de color por pack pero mantiene skin/hair/pose.

### Estructura del sprite 24×30
```
y 0-1: hat (opcional, si hasHat)
y 2-9: cabeza 8×8 (skin) + pelo (hair) en y 2-4 + ojos en y 5 + boca en y 7-8
y 10-21: cuerpo 12×12 (body color), con shadow line y highlights
y 22-27: pants 10×6
y 28-29: shoes (outline color)
arms: pose-dependiente en y 4-20
```

### 6 poses (deterministas)
- `idle` — brazos abajo a los lados
- `arms_up` — brazos arriba
- `wave` — un brazo arriba, otro abajo
- `cheer` — brazos arriba (usado para card_reveal y victory)
- `point` — brazo derecho extendido lateralmente
- `hands_hips` — brazos doblados a las caderas

### 4 estados (overrides visuales sobre el sprite base)
- `normal` — base
- `voted` — halo dorado de píxeles alrededor + chispas en esquinas
- `eliminated` — greyscale + dim (criba)
- `winner` — chispas doradas alrededor (victory)

### Outline pass
Tras renderizar todos los píxeles, segundo paso O(W·H): cada píxel transparente con vecino no-transparente recibe un píxel de outline ink (`#0a0612`). Da la silueta característica.

### Portabilidad a Angular
Opciones:
1. **Component standalone** `<app-sprite [nick]="nick" [pose]="pose" [state]="state" [scale]="3">` que renderice un `<canvas>` con `OnInit` calling `renderToCanvas`. Es lo más directo. El script `sprite.js` se puede convertir a TypeScript con cambios mínimos.
2. **Pre-rendered atlas** — generar PNGs de todos los sprites una vez y cachear. Mejor para perf si hay 60 avatares simultáneos en lobby.

Recomendación: opción 1 para v1, atlas si hay problemas de perf.

---

## 9 · Animaciones — `prototypes/animations.html`

Todas con `step()`, jamás `ease`.

### Migración a columnas (tally_transition)
```scss
@keyframes migrate-in {
  0%   { transform: translateY(-300px) scale(1.2); opacity: 0; }
  50%  { transform: translateY(-100px) scale(1.1); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
animation: migrate-in 2.5s steps(20);
animation-delay: scalado 30ms entre vecinos;
```

### Caída de tier (criba)
```scss
@keyframes column-fall {
  0%   { transform: translateY(0) rotate(0); opacity: 1; }
  20%  { transform: translateY(20px) rotate(2deg); }
  60%  { transform: translateY(200px) rotate(6deg); }
  100% { transform: translateY(800px) rotate(15deg); opacity: 0; }
}
animation: column-fall 1.8s steps(10) forwards;
animation-delay: 50ms entre vecinos para cascada;
```

### Confeti (victory) — 80 partículas
```scss
@keyframes confetti-fall {
  0%   { transform: translateY(-20px); }
  100% { transform: translateY(740px); }
}
animation: confetti-fall 2s steps(20) infinite linear;
animation-delay: random 0..2s;
animation-duration: random 1.5..3s;
```

Generadas en JS al entrar en victory, con colores del pack activo.

### Pulse "streamer ya votó"
```scss
@keyframes pixel-blink {
  0%, 49%   { opacity: 1; }
  50%, 100% { opacity: 0; }
}
.dot { animation: pixel-blink 0.6s step-end infinite; }
.dot.urgent { animation-duration: 0.3s; }
.dot.pending { animation: none; background: var(--c-stone); }
```

### Otros loops
- `pixel-bob` — 4 frames de translateY ±3px, usado para idle pacers, ganador, etc.
- `pixel-pulse` — 2 frames, scale 1 + translate -3px, usado para urgent / focal elements.

---

## 10 · Mecánica del voto — comandos de chat

Spec define los siguientes alias (case-insensitive). El parser del IRC los normaliza a `left` / `right`:

| Comando | Dirección | Notas |
|---|---|---|
| `!izq` `!l` `!1` `!si` | LEFT (NO en pizza, "no he jugado" en RPGs, etc.) | spec usa NO para izq |
| `!der` `!r` `!2` `!no` | RIGHT (SÍ) | spec usa SÍ para der |

⚠ **Cuidado con la semántica:** spec dice "Tinder izquierda/derecha" pero también lista `!si/!no` como aliases. He mapeado `!si → !der → derecha → SÍ` siguiendo la convención Tinder (right swipe = yes). Verificar con product owner si quieren al revés.

Otros comandos:
- `!join` — apuntarse al lobby (sólo en `lobby`, ignored si lobby cerrado o nick baneado)
- `!leave` — desapuntarse (sólo en `lobby`, ignorado en fases posteriores)

Sólo el primer voto válido por viewer por carta cuenta. Posteriores se ignoran silenciosamente.

---

## 11 · Las 5 superficies HTML

Listado de archivos en `prototypes/`. Cada uno se mapea a uno o más componentes Angular.

| HTML | Ruta producción | Componentes Angular sugeridos |
|---|---|---|
| `index.html` | (no producción — solo landing del handoff) | — |
| `design-system.html` | (no producción — documenta el sistema) | — |
| `overlay.html` | `/overlay` | `OverlayComponent` con `<phase-idle>`, `<phase-lobby>`, `<phase-card>`, `<phase-card-reveal>`, `<phase-tally>`, `<phase-criba>`, `<phase-victory>` switching por `game.phase()` signal |
| `streamer.html` | `/streamer` | `StreamerPanelComponent` + tabs/conditional controles. Recibe estado por SignalR y emite acciones (`startLobby`, `voteCard`, `eliminateColumn`, `finalizeCriba`, etc.) |
| `leaderboard.html` | `/leaderboard` | `LeaderboardComponent` con query param `?highlight=` reactiva. Carga top 100 vía `/api/leaderboard`. |
| `packs.html` | (no producción — referencia para diseñar futuros packs) | — |
| `animations.html` | (no producción — referencia de timings) | — |

Las tres rutas que SÍ van a prod son `/overlay`, `/streamer`, `/leaderboard`. El resto son docs internas.

---

## 12 · Layout del overlay (1280×720)

**Decisión aprobada:** stage fija 1280×720 con escalado JS al viewport para preview. En OBS Browser Source se sirve a tamaño nativo (OBS reescala).

```
┌────────────────────────────────────────────────┐ 60px ov-topbar
│ 🍇 PACK     ¿PREGUNTA?     [CARTA 3/10] [✓vote]│
├────────────────────────────────────────────────┤
│                                                │ 616px stage-content
│              (contenido por fase)              │
│                                                │
├────────────────────────────────────────────────┤ 44px ov-bottombar
│ VOTA: !izq !der (aliases: !l/!r !1/!2 !si/!no) │
└────────────────────────────────────────────────┘
```

Topbar siempre visible. La pregunta del pack se atenúa (opacity 0.35) en `idle` y `lobby` (no aplica), full opacity desde `card` en adelante.

---

## 13 · Layout del panel del streamer

Ancho libre. Layout responsive:
```
┌─ status-bar ───────────────────────────────────┐
│ SignalR · Pack · Pregunta · Fase · Lobby/Esp.  │
├─ phase-tabs ───────────────────────────────────┤
│ [IDLE] [LOBBY] [CARD 1..10] [REVEAL] [CRIBA] … │
├──────────────────────────┬─────────────────────┤
│  preview frame 16:9       │                    │
│  (mini overlay)           │  controles          │
│                           │  específicos        │
│ ┌──────────┬──────────┐   │  por fase           │
│ │ chat IRC │ eventos  │   │                    │
│ │ parsed   │ recientes│   │                    │
│ └──────────┴──────────┘   │                    │
└──────────────────────────┴─────────────────────┘
```

Auth: HTTP Basic via middleware ASP.NET. Credenciales en env vars `STREAMER_PANEL_USER`, `STREAMER_PANEL_PASS`.

---

## 14 · Leaderboard

```
GET /leaderboard
GET /leaderboard?highlight=<twitch_nick>
```

Sin auth. Top 100 ordenado por `total_points`.

### Comportamiento
1. **Por defecto:** carga top 100, no highlight.
2. **Input "soy @nick":** busca y resalta la fila (sin filtrar — la lista entera sigue visible).
3. **Query param `?highlight=<nick>`:** al cargar, hace scroll-to-row y aplica la clase `.me`.
4. **Si el nick está fuera del top 100:** mostrar una fila extra arriba/abajo con la posición exacta (spec lo pide pero no está implementado en el HTML — TODO en producción).
5. **Botón "copiar link":** genera `${origin}/leaderboard?highlight=${nick}` y lo copia al clipboard.

API endpoint sugerido:
```
GET /api/leaderboard?limit=100&offset=0
  → { rows: [{ rank, nick, points, games, wins, last_played_at }, ... ], total }

GET /api/leaderboard/me?nick=<nick>
  → { rank, points, games, wins } o 404
```

---

## 15 · Empaquetado de la respuesta SignalR

`/hubs/game` debería emitir un único mensaje `state` con la forma del juego:

```ts
interface GameState {
  phase: 'idle' | 'lobby' | 'card' | 'card_reveal' | 'tally_transition' | 'criba' | 'victory';
  pack?: { id: string; name: string; question: string; primary?: string; accent?: string };
  cardIndex?: number;          // 0..9
  card?: { id: string; image: string; subtitle?: string };
  cardTimerEndsAt?: string;    // ISO datetime
  streamerHasVoted?: boolean;  // pulse del icono
  votes?: { left: number; right: number };
  lobbyPlayers?: { nick: string }[];   // hasta 60
  lobbyCountdownEndsAt?: string;
  tally?: { tier: number; nicks: string[] }[];  // 11 entries 0..10
  eliminated?: number[];                        // tiers que cayeron en criba
  bonus?: { survivors: number; perSurvivor: number };
  finalBoard?: { nick: string; aciertos: number; bonus: number; total: number; rank: number }[];
}
```

(Esto es sugerencia. El backend dev cierra el shape definitivo.)

---

## 16 · Cosas que el prototipo NO resuelve y hay que decidir en implementación

1. **Sonido** — spec dice "sin audio en v1" pero documenta el "crash" visual de la criba. Confirmar.
2. **Twitch IRC offline / reconexión** — UI no muestra "chat desconectado". Si TwitchLib falla, ¿se enseña algo al streamer?
3. **Fallback de imágenes rotas en cartas** — el prototipo usa placeholders `[CHRONO]`. En prod, mostrar la imagen real desde `/wwwroot/assets/packs/<pack-id>/<card-id>.png` con `<img onerror>` que dispare el flujo "carta rota" automáticamente tras 1 retry.
4. **Aforo del lobby > 60** — el spec dice "respuesta por chat" pero no escribimos en chat en v1. Decidir: ¿silenciamos al 61+ o queda fuera de scope hasta v2?
5. **Persistencia mid-criba** — si la app se reinicia mientras el streamer está cribando, ¿se pierde el progreso? Spec dice sí, pero confirmar.
6. **Empate en el tier 10 con muchos viewers** — si 10 viewers tienen 10/10 y el streamer no eliminó ese tier, los 10 ganan +10 bonus cada uno (100/10). Correcto matemáticamente; sólo verificar que el panel muestra esto bien.

---

## 17 · Decisiones aprobadas (cerradas el 2026-05-24)

| Decisión | Elección |
|---|---|
| Pose focal en card_reveal | A · Cheer (brazos arriba) |
| Layout de criba | 11 columnas (0-10 aciertos) |
| Escalado de sprites | Variable por fase (×2 lobby/criba · ×3 reveal · ×6 victory) |
| Tipografía | Press Start 2P (títulos) + VT323 (body) |
| Pack default al arrancar | RPGs Clásicos · "¿lo has jugado entero?" |
| Botón "Carta rota" | Card con borde rojo dentro del flujo, sin hold-to-confirm |

---

## 18 · Cómo abrir los prototipos

```bash
cd prototypes/
python3 -m http.server 8000
# → http://localhost:8000/index.html
```

(`index.html` linka a todas las demás superficies.)

O simplemente abrir `prototypes/index.html` directamente en el navegador — las páginas funcionan con `file://`.

---

## 19 · Archivos en este paquete

```
design_handoff_streamer_tinder/
├── README.md                                       ← este archivo
├── spec/
│   └── 2026-05-23-streamer-tinder-design.md        ← spec funcional canónico
└── prototypes/
    ├── index.html                                  ← landing con links
    ├── design-system.html                          ← paleta + tipo + tokens + sprites
    ├── overlay.html                                ← /overlay · 7 fases
    ├── streamer.html                               ← /streamer · panel operador
    ├── leaderboard.html                            ← /leaderboard
    ├── packs.html                                  ← referencia de 5 packs
    ├── animations.html                             ← timings frame-by-frame
    └── assets/
        ├── tokens.css                              ← TODOS los design tokens (copiar a SCSS)
        └── sprite.js                               ← motor de sprites (portar a TS)
```

---

## 20 · Contacto

Si algo del prototipo no encaja con el spec o si una decisión visual se ha quedado sin documentar, pregunta al product owner. Las dudas explícitas están listadas en sección 16.

Buena suerte.
