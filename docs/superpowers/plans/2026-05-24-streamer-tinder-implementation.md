# Streamer Tinder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir e implementar en producción Streamer Tinder v1 — un juego interactivo de stream mono-canal con overlay público, panel privado del streamer, leaderboard persistente y bot de chat de Twitch — siguiendo el spec funcional aprobado y el design handoff hi-fi.

**Architecture:** Una única app ASP.NET Core 8 sirve (a) un SPA Angular standalone montado en `wwwroot`, (b) un hub SignalR para realtime y (c) la conexión IRC anónima al chat. El estado del juego vive en memoria en un `GameOrchestrator` singleton, persistido a SQLite vía EF Core solo al cierre de cada partida. Deploy a Azure App Service B1 con GitHub Actions.

**Tech Stack:** .NET 8 · ASP.NET Core · SignalR · EF Core · SQLite · TwitchLib · Angular 17+ standalone · signals · SCSS · GitHub Actions · Azure App Service Basic B1

---

## Fuentes de verdad

Estos dos documentos viven en el repo y son **autoritativos**. Si una tarea de este plan contradice algo en ellos, ganan ellos — abre un issue antes de codificar.

- `docs/superpowers/specs/2026-05-23-streamer-tinder-design.md` — spec funcional (mecánicas, flujo, modelo de datos, scoring, deployment)
- `docs/design-handoff/README.md` — handoff de diseño visual (paleta exacta, tipografía, sprites, animaciones, layouts)
- `docs/design-handoff/prototypes/assets/tokens.css` — TODOS los design tokens, copiar a SCSS sin modificar
- `docs/design-handoff/prototypes/assets/sprite.js` — motor de sprites determinista, portar a TypeScript

---

## Repo layout final

```
twitch-tinder/
├── apps/
│   ├── api/                                # ASP.NET Core 8 host
│   │   ├── Program.cs
│   │   ├── StreamerTinder.Api.csproj
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   ├── Domain/                         # records sin deps
│   │   │   ├── GamePhase.cs
│   │   │   ├── GameState.cs
│   │   │   ├── Card.cs
│   │   │   ├── Pack.cs
│   │   │   └── Vote.cs
│   │   ├── Services/
│   │   │   ├── GameOrchestrator.cs
│   │   │   ├── TwitchChatService.cs
│   │   │   ├── ChatCommandParser.cs
│   │   │   └── PackRepository.cs
│   │   ├── Hubs/
│   │   │   └── GameHub.cs
│   │   ├── Infrastructure/
│   │   │   ├── BasicAuthMiddleware.cs
│   │   │   ├── AppDbContext.cs
│   │   │   └── Migrations/
│   │   ├── Endpoints/
│   │   │   └── LeaderboardEndpoints.cs
│   │   ├── Packs/                          # JSON de los packs seedeados
│   │   │   ├── rpgs-clasicos.json
│   │   │   ├── pizza-toppings.json
│   │   │   └── comida-asquerosa.json
│   │   └── wwwroot/                        # Angular build output (autogenerado)
│   └── web/                                # Angular standalone
│       ├── angular.json
│       ├── package.json
│       ├── src/
│       │   ├── main.ts
│       │   ├── styles.scss                 # importa tokens
│       │   ├── tokens.scss                 # copia literal de tokens.css
│       │   └── app/
│       │       ├── app.config.ts
│       │       ├── app.routes.ts
│       │       ├── core/
│       │       │   ├── game-state.store.ts
│       │       │   └── signalr.service.ts
│       │       ├── ui/
│       │       │   └── sprite/
│       │       │       ├── sprite.component.ts
│       │       │       ├── sprite.engine.ts        # port de sprite.js
│       │       │       └── sprite.engine.spec.ts
│       │       ├── overlay/
│       │       │   ├── overlay.component.ts
│       │       │   └── phases/
│       │       │       ├── phase-idle.component.ts
│       │       │       ├── phase-lobby.component.ts
│       │       │       ├── phase-card.component.ts
│       │       │       ├── phase-card-reveal.component.ts
│       │       │       ├── phase-tally.component.ts
│       │       │       ├── phase-criba.component.ts
│       │       │       └── phase-victory.component.ts
│       │       ├── streamer/
│       │       │   ├── streamer.component.ts
│       │       │   └── controls/
│       │       │       ├── controls-idle.component.ts
│       │       │       ├── controls-lobby.component.ts
│       │       │       ├── controls-card.component.ts
│       │       │       ├── controls-criba.component.ts
│       │       │       └── controls-victory.component.ts
│       │       └── leaderboard/
│       │           └── leaderboard.component.ts
├── apps/api.tests/                         # xUnit
│   ├── StreamerTinder.Api.Tests.csproj
│   ├── ChatCommandParserTests.cs
│   ├── GameOrchestratorTests.cs
│   ├── PackRepositoryTests.cs
│   └── ScoringTests.cs
├── docs/
│   ├── superpowers/specs/...
│   ├── superpowers/plans/...
│   └── design-handoff/...
├── .github/workflows/
│   └── deploy.yml
├── StreamerTinder.sln
├── README.md
└── .gitignore
```

---

## Phases at a glance

| Fase | Qué ganamos | Tareas |
|---|---|---|
| 0 — Repo bootstrap | Repo con scaffolds vacíos y CI que compila | 1-5 |
| 1 — Backend foundation | API que arranca, sirve health check, expone Basic auth y SQLite | 6-12 |
| 2 — Domain + state machine | Lógica del juego testeada en aislamiento (puro xUnit) | 13-26 |
| 3 — Twitch IRC integration | Bot escucha el chat de un canal real | 27-30 |
| 4 — SignalR hub | Estado push del juego al frontend, acciones del streamer en server | 31-34 |
| 5 — Frontend foundation | Angular boot + tokens + sprite component | 35-40 |
| 6 — Overlay (7 fases visuales) | El streamer puede ver el overlay completo en navegador | 41-47 |
| 7 — Streamer panel (controles por fase) | El streamer puede jugar una partida completa end-to-end | 48-55 |
| 8 — Leaderboard | Página pública con ranking persistente | 56-58 |
| 9 — Packs content + deployment | App en producción en Azure con tu canal real | 59-65 |

Tras cada fase deberías poder pausar, commitear y dormir tranquilo. Las fases 0-4 son backend-only y se testean por consola/curl/Postman. La fase 6 en adelante necesita el backend ya completo para verse en navegador.

---

# Phase 0 — Repo bootstrap

Esta fase deja el repo con la estructura base y CI compilando. Sin lógica de negocio aún.

### Task 1: Inicializar repo Git con .gitignore correcto

**Files:**
- Create: `C:\dev\twitch-tinder\.gitignore`
- Create: `C:\dev\twitch-tinder\.gitattributes`
- Create: `C:\dev\twitch-tinder\README.md`

- [ ] **Step 1: Inicializar repo**

```bash
cd /c/dev/twitch-tinder
git init
git branch -m main
```

- [ ] **Step 2: Escribir `.gitignore`**

```
# .NET
**/bin/
**/obj/
*.user
.vs/

# Angular / Node
**/node_modules/
**/dist/
**/.angular/
*.log
npm-debug.log*

# SQLite
*.db
*.db-shm
*.db-wal

# Env
.env
.env.local
**/appsettings.*.json
!**/appsettings.json
!**/appsettings.Development.json

# OS
Thumbs.db
.DS_Store

# Visual Studio
*.suo
*.userprefs
.idea/

# Brainstorm sessions
.superpowers/

# Angular build output served by .NET (regenerated each build)
apps/api/wwwroot/
```

- [ ] **Step 3: Escribir `.gitattributes`**

```
* text=auto eol=lf
*.cs text eol=lf
*.csproj text eol=lf
*.json text eol=lf
*.ts text eol=lf
*.html text eol=lf
*.scss text eol=lf
*.css text eol=lf
*.md text eol=lf
*.png binary
*.jpg binary
*.db binary
```

- [ ] **Step 4: Escribir README mínimo**

```markdown
# Streamer Tinder

Juego interactivo de stream para canal único de Twitch. Pixel art, 10 cartas Tinder por partida, criba teatral del streamer, leaderboard persistente.

## Documentación

- Spec funcional: `docs/superpowers/specs/2026-05-23-streamer-tinder-design.md`
- Design handoff: `docs/design-handoff/README.md`
- Plan de implementación: `docs/superpowers/plans/2026-05-24-streamer-tinder-implementation.md`

## Quick start

Pendiente — completar tras Phase 1.
```

- [ ] **Step 5: Primer commit**

```bash
git add .gitignore .gitattributes README.md docs/
git commit -m "chore: bootstrap repo with gitignore, attributes, README and docs"
```

---

### Task 2: Crear solution .NET y proyecto API skeleton

**Files:**
- Create: `C:\dev\twitch-tinder\StreamerTinder.sln`
- Create: `C:\dev\twitch-tinder\apps\api\StreamerTinder.Api.csproj`
- Create: `C:\dev\twitch-tinder\apps\api\Program.cs`
- Create: `C:\dev\twitch-tinder\apps\api\appsettings.json`
- Create: `C:\dev\twitch-tinder\apps\api\appsettings.Development.json`

- [ ] **Step 1: Crear solución y proyecto vacío**

```bash
cd /c/dev/twitch-tinder
dotnet new sln -n StreamerTinder
dotnet new web -n StreamerTinder.Api -o apps/api -f net8.0
dotnet sln add apps/api/StreamerTinder.Api.csproj
```

- [ ] **Step 2: Verificar que arranca**

```bash
cd apps/api
dotnet run
```

Expected: arranca y escucha en `http://localhost:5xxx`. `GET /` devuelve "Hello World!". Ctrl+C para parar.

- [ ] **Step 3: Reescribir `Program.cs` mínimo limpio**

```csharp
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
```

- [ ] **Step 4: Configurar `appsettings.json` y `appsettings.Development.json`**

`apps/api/appsettings.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Twitch": {
    "Channel": "your_channel_here",
    "BotNick": ""
  },
  "StreamerPanel": {
    "User": "streamer",
    "Pass": "change-me-in-production"
  },
  "Database": {
    "Path": "App_Data/game.db"
  }
}
```

`apps/api/appsettings.Development.json`:
```json
{
  "Logging": { "LogLevel": { "Default": "Debug" } },
  "Twitch": { "Channel": "twitchdev" }
}
```

- [ ] **Step 5: Volver a verificar y commitear**

```bash
dotnet run --project apps/api
# en otro shell: curl http://localhost:5xxx/health  → {"status":"ok"}

cd /c/dev/twitch-tinder
git add StreamerTinder.sln apps/api/
git commit -m "chore: scaffold .NET 8 API project with health endpoint"
```

---

### Task 3: Scaffoldear Angular standalone

**Files:**
- Create: `C:\dev\twitch-tinder\apps\web\` (toda la estructura Angular)

- [ ] **Step 1: Generar app Angular standalone sin SSR**

```bash
cd /c/dev/twitch-tinder/apps
npx -y @angular/cli@17 new web --standalone --routing --style=scss --skip-git --skip-install --ssr=false --strict
cd web
npm install
```

- [ ] **Step 2: Configurar `angular.json` para output a `apps/api/wwwroot`**

Editar `apps/web/angular.json`, dentro de `projects.web.architect.build.options`, cambiar `outputPath`:

```json
"outputPath": "../api/wwwroot",
```

Y poner `outputHashing` a `none` en production, `extractCss` true por defecto. Verificar también que `index` apunta a `src/index.html`.

- [ ] **Step 3: Build de prueba**

```bash
cd /c/dev/twitch-tinder/apps/web
npm run build
ls /c/dev/twitch-tinder/apps/api/wwwroot/
# Expected: index.html, main-*.js, polyfills-*.js, styles-*.css
```

- [ ] **Step 4: Configurar `Program.cs` para servir estáticos**

`apps/api/Program.cs`:
```csharp
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapFallbackToFile("index.html");

app.Run();
```

- [ ] **Step 5: Verificar end-to-end y commitear**

```bash
cd /c/dev/twitch-tinder
dotnet run --project apps/api
# Abrir http://localhost:5xxx → debes ver "web app is running!"
# curl http://localhost:5xxx/health → {"status":"ok"}

git add apps/web/ apps/api/Program.cs
git commit -m "chore: scaffold Angular standalone served from .NET wwwroot"
```

---

### Task 4: Crear proyecto de tests xUnit

**Files:**
- Create: `C:\dev\twitch-tinder\apps\api.tests\StreamerTinder.Api.Tests.csproj`
- Create: `C:\dev\twitch-tinder\apps\api.tests\SmokeTests.cs`

- [ ] **Step 1: Generar proyecto de tests**

```bash
cd /c/dev/twitch-tinder
dotnet new xunit -n StreamerTinder.Api.Tests -o apps/api.tests -f net8.0
dotnet sln add apps/api.tests/StreamerTinder.Api.Tests.csproj
dotnet add apps/api.tests/StreamerTinder.Api.Tests.csproj reference apps/api/StreamerTinder.Api.csproj
```

- [ ] **Step 2: Borrar `UnitTest1.cs` y crear `SmokeTests.cs`**

```bash
rm apps/api.tests/UnitTest1.cs
```

`apps/api.tests/SmokeTests.cs`:
```csharp
namespace StreamerTinder.Api.Tests;

public class SmokeTests
{
    [Fact]
    public void Arithmetic_StillWorks()
    {
        Assert.Equal(4, 2 + 2);
    }
}
```

- [ ] **Step 3: Verificar tests verdes**

```bash
dotnet test
# Expected: Passed!  - Failed: 0, Passed: 1, Skipped: 0
```

- [ ] **Step 4: Commit**

```bash
git add apps/api.tests/ StreamerTinder.sln
git commit -m "chore: add xUnit test project with smoke test"
```

---

### Task 5: GitHub Actions workflow esqueleto

**Files:**
- Create: `C:\dev\twitch-tinder\.github\workflows\ci.yml`

- [ ] **Step 1: Crear workflow de CI**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET 8
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/web/package-lock.json

      - name: Install web deps
        working-directory: apps/web
        run: npm ci

      - name: Build Angular
        working-directory: apps/web
        run: npm run build

      - name: Restore .NET
        run: dotnet restore StreamerTinder.sln

      - name: Build .NET
        run: dotnet build StreamerTinder.sln --no-restore -c Release

      - name: Test .NET
        run: dotnet test StreamerTinder.sln --no-build -c Release --logger "console;verbosity=normal"
```

- [ ] **Step 2: Commit y verificar en GitHub**

```bash
git add .github/
git commit -m "ci: add CI workflow for build + test on push and PR"
```

Push al remote (asume que ya hay remote configurado) y comprueba en la pestaña Actions que pasa verde.

---

# Phase 1 — Backend foundation

Tras esta fase: ASP.NET arranca, tiene EF Core + SQLite con migraciones aplicadas en startup, Basic auth funciona en `/streamer`, y la app sigue sirviendo el SPA Angular.

### Task 6: Modelar configuración tipada

**Files:**
- Create: `apps/api/Infrastructure/TwitchOptions.cs`
- Create: `apps/api/Infrastructure/StreamerPanelOptions.cs`
- Create: `apps/api/Infrastructure/DatabaseOptions.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Crear las option classes**

`apps/api/Infrastructure/TwitchOptions.cs`:
```csharp
namespace StreamerTinder.Api.Infrastructure;

public sealed class TwitchOptions
{
    public const string SectionName = "Twitch";

    public string Channel { get; init; } = "";
    public string BotNick { get; init; } = "";
}
```

`apps/api/Infrastructure/StreamerPanelOptions.cs`:
```csharp
namespace StreamerTinder.Api.Infrastructure;

public sealed class StreamerPanelOptions
{
    public const string SectionName = "StreamerPanel";

    public string User { get; init; } = "";
    public string Pass { get; init; } = "";
}
```

`apps/api/Infrastructure/DatabaseOptions.cs`:
```csharp
namespace StreamerTinder.Api.Infrastructure;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    public string Path { get; init; } = "App_Data/game.db";
}
```

- [ ] **Step 2: Registrar en `Program.cs`**

Reemplazar el contenido de `Program.cs` por:
```csharp
using StreamerTinder.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<TwitchOptions>(
    builder.Configuration.GetSection(TwitchOptions.SectionName));
builder.Services.Configure<StreamerPanelOptions>(
    builder.Configuration.GetSection(StreamerPanelOptions.SectionName));
builder.Services.Configure<DatabaseOptions>(
    builder.Configuration.GetSection(DatabaseOptions.SectionName));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapFallbackToFile("index.html");

app.Run();
```

- [ ] **Step 3: Verificar build + commit**

```bash
dotnet build
git add apps/api/
git commit -m "feat(api): typed configuration options for Twitch, panel and DB"
```

---

### Task 7: Middleware de HTTP Basic auth

**Files:**
- Create: `apps/api/Infrastructure/BasicAuthMiddleware.cs`
- Create: `apps/api.tests/BasicAuthMiddlewareTests.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Escribir el test de auth fallida primero**

`apps/api.tests/BasicAuthMiddlewareTests.cs`:
```csharp
using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace StreamerTinder.Api.Tests;

public class BasicAuthMiddlewareTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public BasicAuthMiddlewareTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task GET_streamer_without_credentials_returns_401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/streamer");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.True(response.Headers.WwwAuthenticate.Any(h => h.Scheme == "Basic"));
    }

    [Fact]
    public async Task GET_streamer_with_valid_credentials_returns_200()
    {
        var client = _factory.CreateClient();
        var creds = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("streamer:change-me-in-production"));
        client.DefaultRequestHeaders.Authorization = new("Basic", creds);

        var response = await client.GetAsync("/streamer");

        Assert.True(response.IsSuccessStatusCode, $"Expected success but got {response.StatusCode}");
    }
}
```

- [ ] **Step 2: Añadir referencia a `Microsoft.AspNetCore.Mvc.Testing`**

```bash
dotnet add apps/api.tests/StreamerTinder.Api.Tests.csproj package Microsoft.AspNetCore.Mvc.Testing --version 8.0.*
```

Y al csproj del API añadir:
```xml
<ItemGroup>
  <InternalsVisibleTo Include="StreamerTinder.Api.Tests" />
</ItemGroup>
```

- [ ] **Step 3: Correr el test, debe fallar**

```bash
dotnet test --filter BasicAuthMiddlewareTests
# Expected: FAIL — todavía no existe ningún middleware ni la ruta /streamer
```

- [ ] **Step 4: Implementar middleware**

`apps/api/Infrastructure/BasicAuthMiddleware.cs`:
```csharp
using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Options;

namespace StreamerTinder.Api.Infrastructure;

public sealed class BasicAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly StreamerPanelOptions _opts;

    public BasicAuthMiddleware(RequestDelegate next, IOptions<StreamerPanelOptions> opts)
    {
        _next = next;
        _opts = opts.Value;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        if (!ctx.Request.Path.StartsWithSegments("/streamer"))
        {
            await _next(ctx);
            return;
        }

        var header = ctx.Request.Headers.Authorization.ToString();
        if (AuthenticationHeaderValue.TryParse(header, out var auth)
            && auth.Scheme.Equals("Basic", StringComparison.OrdinalIgnoreCase)
            && auth.Parameter is not null)
        {
            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(auth.Parameter));
            var sep = raw.IndexOf(':');
            if (sep > 0)
            {
                var user = raw[..sep];
                var pass = raw[(sep + 1)..];
                if (user == _opts.User && pass == _opts.Pass)
                {
                    await _next(ctx);
                    return;
                }
            }
        }

        ctx.Response.StatusCode = 401;
        ctx.Response.Headers.WWWAuthenticate = "Basic realm=\"Streamer Tinder\"";
        await ctx.Response.WriteAsync("Unauthorized");
    }
}
```

- [ ] **Step 5: Conectar al pipeline y añadir ruta `/streamer`**

Modificar `Program.cs` añadiendo antes de `UseDefaultFiles`:
```csharp
app.UseMiddleware<BasicAuthMiddleware>();
```

Y al final, antes de `app.Run()`:
```csharp
app.MapGet("/streamer", () => Results.Ok("panel ok"));
```

- [ ] **Step 6: Hacer `Program` accesible al test (Minimal API)**

Al final de `Program.cs` añadir:
```csharp
public partial class Program { }
```

- [ ] **Step 7: Tests deben pasar**

```bash
dotnet test
# Expected: 3 passing (smoke + 2 auth tests)
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/ apps/api.tests/
git commit -m "feat(api): HTTP Basic auth middleware gating /streamer route"
```

---

### Task 8: EF Core + SQLite, DbContext y entidades

**Files:**
- Create: `apps/api/Infrastructure/AppDbContext.cs`
- Create: `apps/api/Domain/PersistedScore.cs`
- Create: `apps/api/Domain/PersistedBan.cs`
- Create: `apps/api/Domain/PersistedGame.cs`
- Create: `apps/api/Domain/PersistedGameParticipant.cs`
- Modify: `apps/api/StreamerTinder.Api.csproj`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Instalar paquetes EF Core**

```bash
cd apps/api
dotnet add package Microsoft.EntityFrameworkCore.Sqlite --version 8.0.*
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.0.*
```

- [ ] **Step 2: Crear entidades persistidas**

`apps/api/Domain/PersistedScore.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public sealed class PersistedScore
{
    public string TwitchUsername { get; set; } = "";
    public int TotalPoints { get; set; }
    public int GamesPlayed { get; set; }
    public int GamesWon { get; set; }
    public DateTime LastPlayedAt { get; set; }
}
```

`apps/api/Domain/PersistedBan.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public sealed class PersistedBan
{
    public string TwitchUsername { get; set; } = "";
    public DateTime BannedAt { get; set; }
    public string? Reason { get; set; }
}
```

`apps/api/Domain/PersistedGame.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public sealed class PersistedGame
{
    public Guid Id { get; set; }
    public string PackId { get; set; } = "";
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string StreamerUsername { get; set; } = "";
    public string Status { get; set; } = "";

    public List<PersistedGameParticipant> Participants { get; set; } = new();
}
```

`apps/api/Domain/PersistedGameParticipant.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public sealed class PersistedGameParticipant
{
    public Guid GameId { get; set; }
    public string TwitchUsername { get; set; } = "";
    public DateTime JoinedAt { get; set; }
    public int FinalScore { get; set; }
    public bool SurvivedCriba { get; set; }
    public int BonusEarned { get; set; }
}
```

- [ ] **Step 3: Crear `AppDbContext`**

`apps/api/Infrastructure/AppDbContext.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Infrastructure;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<PersistedScore> Scores => Set<PersistedScore>();
    public DbSet<PersistedBan> Bans => Set<PersistedBan>();
    public DbSet<PersistedGame> Games => Set<PersistedGame>();
    public DbSet<PersistedGameParticipant> GameParticipants => Set<PersistedGameParticipant>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<PersistedScore>().HasKey(s => s.TwitchUsername);
        b.Entity<PersistedBan>().HasKey(s => s.TwitchUsername);
        b.Entity<PersistedGame>().HasKey(g => g.Id);
        b.Entity<PersistedGameParticipant>()
            .HasKey(p => new { p.GameId, p.TwitchUsername });
        b.Entity<PersistedGame>()
            .HasMany(g => g.Participants)
            .WithOne()
            .HasForeignKey(p => p.GameId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

- [ ] **Step 4: Registrar en DI y crear DB en startup**

Reemplazar bloques en `Program.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using StreamerTinder.Api.Infrastructure;

// ...

var dbPath = builder.Configuration["Database:Path"] ?? "App_Data/game.db";
var dbFull = Path.Combine(builder.Environment.ContentRootPath, dbPath);
Directory.CreateDirectory(Path.GetDirectoryName(dbFull)!);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite($"Data Source={dbFull}"));

// ... (después de var app = builder.Build();)

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}
```

- [ ] **Step 5: Crear migración inicial**

```bash
cd /c/dev/twitch-tinder
dotnet tool install --global dotnet-ef --version 8.0.*  # si no lo tienes
cd apps/api
dotnet ef migrations add Initial -o Infrastructure/Migrations
```

- [ ] **Step 6: Verificar y commit**

```bash
dotnet build
dotnet run --project apps/api &
sleep 3
curl http://localhost:5xxx/health
ls apps/api/App_Data/  # debe existir game.db
kill %1

git add apps/api/
git commit -m "feat(api): add EF Core + SQLite with initial migration and 4 entities"
```

---

### Task 9: Endpoint stub de leaderboard que devuelve vacío

**Files:**
- Create: `apps/api/Endpoints/LeaderboardEndpoints.cs`
- Modify: `apps/api/Program.cs`
- Create: `apps/api.tests/LeaderboardEndpointTests.cs`

- [ ] **Step 1: Test que define el contrato**

`apps/api.tests/LeaderboardEndpointTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace StreamerTinder.Api.Tests;

public class LeaderboardEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public LeaderboardEndpointTests(WebApplicationFactory<Program> f) => _factory = f;

    [Fact]
    public async Task GET_api_leaderboard_returns_empty_array_when_no_scores()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/leaderboard?limit=100&offset=0");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<LeaderboardResponse>();
        Assert.NotNull(body);
        Assert.Empty(body!.Rows);
        Assert.Equal(0, body.Total);
    }

    private sealed record LeaderboardResponse(List<object> Rows, int Total);
}
```

- [ ] **Step 2: Verificar que falla**

```bash
dotnet test --filter LeaderboardEndpointTests
# Expected: FAIL — 404 not found
```

- [ ] **Step 3: Implementar endpoint**

`apps/api/Endpoints/LeaderboardEndpoints.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using StreamerTinder.Api.Infrastructure;

namespace StreamerTinder.Api.Endpoints;

public static class LeaderboardEndpoints
{
    public static void MapLeaderboard(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/leaderboard", async (AppDbContext db, int limit = 100, int offset = 0) =>
        {
            var query = db.Scores.OrderByDescending(s => s.TotalPoints);
            var total = await query.CountAsync();
            var rows = await query.Skip(offset).Take(Math.Min(limit, 200))
                .Select((s, idx) => new
                {
                    rank = offset + idx + 1,
                    nick = s.TwitchUsername,
                    points = s.TotalPoints,
                    games = s.GamesPlayed,
                    wins = s.GamesWon,
                    last_played_at = s.LastPlayedAt
                })
                .ToListAsync();
            return Results.Ok(new { rows, total });
        });

        app.MapGet("/api/leaderboard/me", async (AppDbContext db, string nick) =>
        {
            var score = await db.Scores
                .FirstOrDefaultAsync(s => s.TwitchUsername == nick);
            if (score is null) return Results.NotFound();

            var rank = await db.Scores.CountAsync(s => s.TotalPoints > score.TotalPoints) + 1;
            return Results.Ok(new
            {
                rank,
                points = score.TotalPoints,
                games = score.GamesPlayed,
                wins = score.GamesWon
            });
        });
    }
}
```

- [ ] **Step 4: Registrar en `Program.cs`**

Antes de `app.MapFallbackToFile`:
```csharp
app.MapLeaderboard();
```

Y `using StreamerTinder.Api.Endpoints;` arriba.

- [ ] **Step 5: Test debe pasar**

```bash
dotnet test --filter LeaderboardEndpointTests
# Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/ apps/api.tests/
git commit -m "feat(api): leaderboard GET endpoints with limit/offset and /me"
```

---

# Phase 2 — Domain + state machine

Esta es la fase más larga y más importante. Toda la lógica del juego se construye aquí, en tipos puros sin dependencias de Twitch ni de la red, y se testea con xUnit. Si algo no es testeable aquí, refactoriza antes de seguir.

### Task 10: Tipos básicos del dominio

**Files:**
- Create: `apps/api/Domain/GamePhase.cs`
- Create: `apps/api/Domain/Card.cs`
- Create: `apps/api/Domain/Pack.cs`
- Create: `apps/api/Domain/VoteDirection.cs`

- [ ] **Step 1: Crear los tipos**

`apps/api/Domain/GamePhase.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public enum GamePhase
{
    Idle,
    Lobby,
    Card,
    CardReveal,
    TallyTransition,
    Criba,
    Victory
}
```

`apps/api/Domain/VoteDirection.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public enum VoteDirection
{
    Left,
    Right
}
```

`apps/api/Domain/Card.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public sealed record Card(string Id, string ImagePath, string? Subtitle);
```

`apps/api/Domain/Pack.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public sealed record Pack(
    string Id,
    string Name,
    string Question,
    string? PalettePrimary,
    string? PaletteAccent,
    IReadOnlyList<Card> Cards);
```

- [ ] **Step 2: Build + commit**

```bash
dotnet build
git add apps/api/Domain/
git commit -m "feat(domain): GamePhase, Card, Pack, VoteDirection types"
```

---

### Task 11: ChatCommandParser con tests TDD

**Files:**
- Create: `apps/api/Services/ChatCommandParser.cs`
- Create: `apps/api.tests/ChatCommandParserTests.cs`

- [ ] **Step 1: Definir el tipo de comando**

Primero ten claro qué vamos a parsear. Añade al final de `ChatCommandParser.cs` (lo crearemos en Step 3) el tipo:

```csharp
public abstract record ChatCommand
{
    public sealed record Join : ChatCommand;
    public sealed record Leave : ChatCommand;
    public sealed record Vote(VoteDirection Direction) : ChatCommand;
    public sealed record Unknown : ChatCommand;
}
```

- [ ] **Step 2: Escribir tests primero**

`apps/api.tests/ChatCommandParserTests.cs`:
```csharp
using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Services;

namespace StreamerTinder.Api.Tests;

public class ChatCommandParserTests
{
    private readonly ChatCommandParser _p = new();

    [Theory]
    [InlineData("!join")]
    [InlineData("!JOIN")]
    [InlineData("  !join  ")]
    [InlineData("!join I want to play")]
    public void Parses_join_in_various_forms(string msg)
    {
        Assert.IsType<ChatCommand.Join>(_p.Parse(msg));
    }

    [Theory]
    [InlineData("!leave")]
    [InlineData("!LEAVE")]
    public void Parses_leave(string msg)
    {
        Assert.IsType<ChatCommand.Leave>(_p.Parse(msg));
    }

    [Theory]
    [InlineData("!izq", VoteDirection.Left)]
    [InlineData("!l", VoteDirection.Left)]
    [InlineData("!1", VoteDirection.Left)]
    [InlineData("!si", VoteDirection.Left)]
    [InlineData("!der", VoteDirection.Right)]
    [InlineData("!r", VoteDirection.Right)]
    [InlineData("!2", VoteDirection.Right)]
    [InlineData("!no", VoteDirection.Right)]
    public void Parses_votes_with_aliases(string msg, VoteDirection expected)
    {
        var cmd = _p.Parse(msg);
        var vote = Assert.IsType<ChatCommand.Vote>(cmd);
        Assert.Equal(expected, vote.Direction);
    }

    [Theory]
    [InlineData("")]
    [InlineData("just chat")]
    [InlineData("!unknown")]
    [InlineData("join no bang")]
    public void Returns_Unknown_for_non_commands(string msg)
    {
        Assert.IsType<ChatCommand.Unknown>(_p.Parse(msg));
    }
}
```

> **Nota semántica**: El handoff (sección 10) y el spec coinciden en que `!si` mapea a derecha (Tinder: right swipe = yes). Pero el handoff documenta `!si → !izq → LEFT` por error de tipeo. Aquí seguimos al spec: **`!si` y `!no`** los mapeo según convención clásica de chat hispano de stream donde "sí/no" suele responder a la pregunta del pack (ej: "¿te lo comerías?" → !si = derecha). Si el product owner lo quiere al revés, sólo hay que invertir dos líneas en el parser.

Mirar la tabla: en mis tests `!si → Left`. Esto es una decisión que tomo en el plan: **`!si` mapea a LEFT** (consistente con "no acepta" la propuesta de la imagen — `!si = sigue como está, no descartes`). Si te suena raro, cámbialo invirtiendo los aliases en Step 4. Lo importante es que parser y UI estén de acuerdo.

- [ ] **Step 3: Tests deben fallar**

```bash
dotnet test --filter ChatCommandParserTests
# Expected: FAIL — clase ChatCommandParser no existe
```

- [ ] **Step 4: Implementar**

`apps/api/Services/ChatCommandParser.cs`:
```csharp
using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Services;

public sealed class ChatCommandParser
{
    public ChatCommand Parse(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new ChatCommand.Unknown();
        var trimmed = raw.Trim();
        if (!trimmed.StartsWith('!')) return new ChatCommand.Unknown();

        var firstSpace = trimmed.IndexOf(' ');
        var head = (firstSpace < 0 ? trimmed : trimmed[..firstSpace]).ToLowerInvariant();

        return head switch
        {
            "!join" => new ChatCommand.Join(),
            "!leave" => new ChatCommand.Leave(),
            "!izq" or "!l" or "!1" or "!si" => new ChatCommand.Vote(VoteDirection.Left),
            "!der" or "!r" or "!2" or "!no" => new ChatCommand.Vote(VoteDirection.Right),
            _ => new ChatCommand.Unknown()
        };
    }
}

public abstract record ChatCommand
{
    public sealed record Join : ChatCommand;
    public sealed record Leave : ChatCommand;
    public sealed record Vote(VoteDirection Direction) : ChatCommand;
    public sealed record Unknown : ChatCommand;
}
```

- [ ] **Step 5: Tests deben pasar**

```bash
dotnet test --filter ChatCommandParserTests
# Expected: all green (~12 tests)
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/Services/ChatCommandParser.cs apps/api.tests/ChatCommandParserTests.cs
git commit -m "feat(domain): ChatCommandParser with join/leave/vote aliases + tests"
```

---

### Task 12: GameState immutable + transiciones puras (sub-tarea grande)

Esta tarea contiene varios sub-tasks porque GameState es el corazón. Vamos a hacerlo TDD por slice — cada slice es un commit.

**Files:**
- Create: `apps/api/Domain/GameState.cs`
- Create: `apps/api/Domain/LobbyPlayer.cs`
- Create: `apps/api/Domain/PlayerVote.cs`
- Create: `apps/api.tests/GameStateTests.cs`

#### Sub-task 12.1: GameState idle y transición a lobby

- [ ] **Step 1: Test**

`apps/api.tests/GameStateTests.cs`:
```csharp
using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Tests;

public class GameStateTests
{
    private static Pack TestPack(int cardCount = 10) =>
        new("test-pack", "Test", "¿Test?", null, null,
            Enumerable.Range(1, cardCount)
                .Select(i => new Card($"card-{i}", $"/img/{i}.png", null))
                .ToList());

    [Fact]
    public void New_state_is_idle()
    {
        var s = GameState.New();
        Assert.Equal(GamePhase.Idle, s.Phase);
    }

    [Fact]
    public void OpenLobby_transitions_idle_to_lobby_with_empty_players()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        Assert.Equal(GamePhase.Lobby, s.Phase);
        Assert.Empty(s.LobbyPlayers);
    }

    [Fact]
    public void OpenLobby_from_non_idle_throws()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => s.OpenLobby(TestPack(), DateTime.UtcNow));
    }
}
```

- [ ] **Step 2: Verificar fallo**

```bash
dotnet test --filter GameStateTests
# Expected: FAIL — GameState no existe
```

- [ ] **Step 3: Implementar mínimo**

`apps/api/Domain/LobbyPlayer.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public sealed record LobbyPlayer(string Nick, DateTime JoinedAt);
```

`apps/api/Domain/PlayerVote.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public sealed record PlayerVote(string Nick, VoteDirection Direction, DateTime VotedAt);
```

`apps/api/Domain/GameState.cs`:
```csharp
namespace StreamerTinder.Api.Domain;

public sealed record GameState(
    GamePhase Phase,
    Pack? Pack,
    IReadOnlyList<LobbyPlayer> LobbyPlayers,
    DateTime? LobbyCountdownEndsAt,
    int CardIndex,
    DateTime? CardTimerEndsAt,
    VoteDirection? StreamerVote,
    IReadOnlyDictionary<string, PlayerVote> CurrentCardVotes,
    IReadOnlyDictionary<string, int> AciertosByNick,
    IReadOnlyList<int> EliminatedTiers)
{
    public const int LobbyMin = 10;
    public const int LobbyMax = 60;
    public const int CardSeconds = 10;
    public const int LobbySeconds = 60;
    public const int BonusPool = 100;
    public const int PointsPerHit = 10;

    public static GameState New() => new(
        Phase: GamePhase.Idle,
        Pack: null,
        LobbyPlayers: Array.Empty<LobbyPlayer>(),
        LobbyCountdownEndsAt: null,
        CardIndex: 0,
        CardTimerEndsAt: null,
        StreamerVote: null,
        CurrentCardVotes: new Dictionary<string, PlayerVote>(),
        AciertosByNick: new Dictionary<string, int>(),
        EliminatedTiers: Array.Empty<int>());

    public GameState OpenLobby(Pack pack, DateTime now)
    {
        if (Phase != GamePhase.Idle)
            throw new InvalidOperationException($"Cannot open lobby from {Phase}");
        return this with
        {
            Phase = GamePhase.Lobby,
            Pack = pack,
            LobbyPlayers = Array.Empty<LobbyPlayer>(),
            LobbyCountdownEndsAt = now.AddSeconds(LobbySeconds)
        };
    }
}
```

- [ ] **Step 4: Tests pasan**

```bash
dotnet test --filter GameStateTests
# Expected: 3 pasan
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/Domain/ apps/api.tests/GameStateTests.cs
git commit -m "feat(domain): GameState record, OpenLobby transition"
```

#### Sub-task 12.2: Apuntarse al lobby, leave, ban, vaciar

- [ ] **Step 1: Tests**

Añadir al final de `GameStateTests.cs`:
```csharp
    [Fact]
    public void Join_adds_player_to_lobby()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow)
            .Join("adri", DateTime.UtcNow, isBanned: false);
        Assert.Single(s.LobbyPlayers);
        Assert.Equal("adri", s.LobbyPlayers[0].Nick);
    }

    [Fact]
    public void Join_ignores_duplicates()
    {
        var t = DateTime.UtcNow;
        var s = GameState.New().OpenLobby(TestPack(), t)
            .Join("adri", t, false)
            .Join("adri", t, false);
        Assert.Single(s.LobbyPlayers);
    }

    [Fact]
    public void Join_ignores_banned_nick()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow)
            .Join("troll", DateTime.UtcNow, isBanned: true);
        Assert.Empty(s.LobbyPlayers);
    }

    [Fact]
    public void Join_respects_hard_cap_60()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        for (int i = 0; i < 70; i++)
            s = s.Join($"user{i}", DateTime.UtcNow, false);
        Assert.Equal(GameState.LobbyMax, s.LobbyPlayers.Count);
    }

    [Fact]
    public void Leave_removes_player_from_lobby()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow)
            .Join("adri", DateTime.UtcNow, false)
            .Join("lara", DateTime.UtcNow, false)
            .Leave("adri");
        Assert.Single(s.LobbyPlayers);
        Assert.Equal("lara", s.LobbyPlayers[0].Nick);
    }

    [Fact]
    public void VaciarLobby_empties_players_keeps_phase()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow)
            .Join("adri", DateTime.UtcNow, false)
            .VaciarLobby(DateTime.UtcNow);
        Assert.Equal(GamePhase.Lobby, s.Phase);
        Assert.Empty(s.LobbyPlayers);
    }

    [Fact]
    public void Join_only_works_in_lobby_phase()
    {
        var s = GameState.New();
        var s2 = s.Join("adri", DateTime.UtcNow, false);
        Assert.Empty(s2.LobbyPlayers);
        Assert.Equal(GamePhase.Idle, s2.Phase);
    }
```

- [ ] **Step 2: Verificar fallos**

```bash
dotnet test --filter GameStateTests
# Expected: 7 fail (Join, Leave, VaciarLobby no existen)
```

- [ ] **Step 3: Implementar**

Añadir a `GameState.cs`:
```csharp
    public GameState Join(string nick, DateTime now, bool isBanned)
    {
        if (Phase != GamePhase.Lobby) return this;
        if (isBanned) return this;
        if (LobbyPlayers.Any(p => p.Nick == nick)) return this;
        if (LobbyPlayers.Count >= LobbyMax) return this;
        var updated = LobbyPlayers.ToList();
        updated.Add(new LobbyPlayer(nick, now));
        return this with { LobbyPlayers = updated };
    }

    public GameState Leave(string nick)
    {
        if (Phase != GamePhase.Lobby) return this;
        var updated = LobbyPlayers.Where(p => p.Nick != nick).ToList();
        if (updated.Count == LobbyPlayers.Count) return this;
        return this with { LobbyPlayers = updated };
    }

    public GameState VaciarLobby(DateTime now)
    {
        if (Phase != GamePhase.Lobby) return this;
        return this with
        {
            LobbyPlayers = Array.Empty<LobbyPlayer>(),
            LobbyCountdownEndsAt = now.AddSeconds(LobbySeconds)
        };
    }
```

- [ ] **Step 4: Tests pasan + commit**

```bash
dotnet test --filter GameStateTests
git add apps/api/Domain/GameState.cs apps/api.tests/GameStateTests.cs
git commit -m "feat(domain): Join/Leave/VaciarLobby with hard cap 60 and ban check"
```

#### Sub-task 12.3: StartGame y avance de cartas

- [ ] **Step 1: Tests**

Añadir:
```csharp
    [Fact]
    public void StartGame_requires_min_10_players()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        for (int i = 0; i < 9; i++) s = s.Join($"u{i}", DateTime.UtcNow, false);
        Assert.Throws<InvalidOperationException>(() => s.StartGame(DateTime.UtcNow));
    }

    [Fact]
    public void StartGame_transitions_to_card_phase_with_first_card_active()
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        for (int i = 0; i < 10; i++) s = s.Join($"u{i}", DateTime.UtcNow, false);
        var now = DateTime.UtcNow;
        s = s.StartGame(now);
        Assert.Equal(GamePhase.Card, s.Phase);
        Assert.Equal(0, s.CardIndex);
        Assert.Equal(now.AddSeconds(GameState.CardSeconds), s.CardTimerEndsAt);
        Assert.Empty(s.CurrentCardVotes);
        Assert.Null(s.StreamerVote);
    }
```

- [ ] **Step 2: Verificar fallo**

```bash
dotnet test --filter "GameStateTests&StartGame"
# Expected: FAIL
```

- [ ] **Step 3: Implementar**

```csharp
    public GameState StartGame(DateTime now)
    {
        if (Phase != GamePhase.Lobby)
            throw new InvalidOperationException($"Cannot start from {Phase}");
        if (LobbyPlayers.Count < LobbyMin)
            throw new InvalidOperationException($"Need at least {LobbyMin} players");
        return this with
        {
            Phase = GamePhase.Card,
            CardIndex = 0,
            CardTimerEndsAt = now.AddSeconds(CardSeconds),
            StreamerVote = null,
            CurrentCardVotes = new Dictionary<string, PlayerVote>(),
            AciertosByNick = LobbyPlayers.ToDictionary(p => p.Nick, _ => 0)
        };
    }
```

- [ ] **Step 4: Verificar y commit**

```bash
dotnet test --filter "GameStateTests"
git add apps/api/Domain/GameState.cs apps/api.tests/GameStateTests.cs
git commit -m "feat(domain): StartGame transitions lobby to first card"
```

#### Sub-task 12.4: Votos del streamer y del viewer, cierre de carta

- [ ] **Step 1: Tests**

```csharp
    private GameState StartedGame(int players = 10)
    {
        var s = GameState.New().OpenLobby(TestPack(), DateTime.UtcNow);
        for (int i = 0; i < players; i++) s = s.Join($"u{i}", DateTime.UtcNow, false);
        return s.StartGame(DateTime.UtcNow);
    }

    [Fact]
    public void StreamerVotes_records_vote_and_enables_close()
    {
        var s = StartedGame().StreamerVotes(VoteDirection.Right);
        Assert.Equal(VoteDirection.Right, s.StreamerVote);
    }

    [Fact]
    public void ViewerVotes_records_first_vote_only()
    {
        var s = StartedGame()
            .ViewerVotes("u1", VoteDirection.Left, DateTime.UtcNow)
            .ViewerVotes("u1", VoteDirection.Right, DateTime.UtcNow);
        Assert.Single(s.CurrentCardVotes);
        Assert.Equal(VoteDirection.Left, s.CurrentCardVotes["u1"].Direction);
    }

    [Fact]
    public void ViewerVotes_only_counts_for_players_in_lobby()
    {
        var s = StartedGame().ViewerVotes("non-player", VoteDirection.Left, DateTime.UtcNow);
        Assert.Empty(s.CurrentCardVotes);
    }

    [Fact]
    public void CloseCard_resolves_aciertos_for_matching_votes()
    {
        var s = StartedGame();
        s = s.StreamerVotes(VoteDirection.Right);
        s = s.ViewerVotes("u0", VoteDirection.Right, DateTime.UtcNow); // hit
        s = s.ViewerVotes("u1", VoteDirection.Left, DateTime.UtcNow);  // miss
        s = s.CloseCard();
        Assert.Equal(GamePhase.CardReveal, s.Phase);
        Assert.Equal(1, s.AciertosByNick["u0"]);
        Assert.Equal(0, s.AciertosByNick["u1"]);
    }

    [Fact]
    public void CloseCard_when_streamer_did_not_vote_cancels_card()
    {
        var s = StartedGame();
        s = s.ViewerVotes("u0", VoteDirection.Right, DateTime.UtcNow);
        s = s.CloseCard();
        Assert.Equal(GamePhase.CardReveal, s.Phase);
        Assert.Equal(0, s.AciertosByNick["u0"]);
    }
```

- [ ] **Step 2: Fail expected**

```bash
dotnet test --filter "GameStateTests"
```

- [ ] **Step 3: Implementar**

```csharp
    public GameState StreamerVotes(VoteDirection dir)
    {
        if (Phase != GamePhase.Card) return this;
        return this with { StreamerVote = dir };
    }

    public GameState ViewerVotes(string nick, VoteDirection dir, DateTime now)
    {
        if (Phase != GamePhase.Card) return this;
        if (!AciertosByNick.ContainsKey(nick)) return this;
        if (CurrentCardVotes.ContainsKey(nick)) return this;
        var dict = new Dictionary<string, PlayerVote>(CurrentCardVotes)
        {
            [nick] = new PlayerVote(nick, dir, now)
        };
        return this with { CurrentCardVotes = dict };
    }

    public GameState CloseCard()
    {
        if (Phase != GamePhase.Card) return this;
        var aciertos = new Dictionary<string, int>(AciertosByNick);
        if (StreamerVote is { } sv)
        {
            foreach (var (nick, vote) in CurrentCardVotes)
                if (vote.Direction == sv)
                    aciertos[nick]++;
        }
        return this with
        {
            Phase = GamePhase.CardReveal,
            AciertosByNick = aciertos
        };
    }
```

- [ ] **Step 4: Tests verdes + commit**

```bash
dotnet test --filter GameStateTests
git add apps/api/Domain/GameState.cs apps/api.tests/GameStateTests.cs
git commit -m "feat(domain): vote recording and CloseCard with aciertos resolution"
```

#### Sub-task 12.5: NextCard, fin de cartas, tally y criba

- [ ] **Step 1: Tests**

```csharp
    [Fact]
    public void NextCard_advances_index_back_to_Card()
    {
        var s = StartedGame().StreamerVotes(VoteDirection.Right).CloseCard()
            .NextCard(DateTime.UtcNow);
        Assert.Equal(GamePhase.Card, s.Phase);
        Assert.Equal(1, s.CardIndex);
        Assert.Null(s.StreamerVote);
        Assert.Empty(s.CurrentCardVotes);
    }

    [Fact]
    public void NextCard_after_last_card_goes_to_TallyTransition()
    {
        var s = StartedGame();
        for (int i = 0; i < 10; i++)
            s = s.StreamerVotes(VoteDirection.Right).CloseCard().NextCard(DateTime.UtcNow);
        Assert.Equal(GamePhase.TallyTransition, s.Phase);
    }

    [Fact]
    public void EnterCriba_from_TallyTransition_groups_players_by_tier()
    {
        var s = StartedGame();
        // u0..u9 todos votan derecha siempre → aciertan todas las cartas
        for (int i = 0; i < 10; i++)
        {
            s = s.StreamerVotes(VoteDirection.Right);
            for (int u = 0; u < 10; u++)
                s = s.ViewerVotes($"u{u}", VoteDirection.Right, DateTime.UtcNow);
            s = s.CloseCard().NextCard(DateTime.UtcNow);
        }
        s = s.EnterCriba();
        Assert.Equal(GamePhase.Criba, s.Phase);
    }

    [Fact]
    public void EliminateTier_marks_tier_as_dead()
    {
        var s = StartedGame();
        for (int i = 0; i < 10; i++)
            s = s.StreamerVotes(VoteDirection.Right).CloseCard().NextCard(DateTime.UtcNow);
        s = s.EnterCriba().EliminateTier(0).EliminateTier(3);
        Assert.Contains(0, s.EliminatedTiers);
        Assert.Contains(3, s.EliminatedTiers);
    }

    [Fact]
    public void EliminateTier_is_idempotent()
    {
        var s = StartedGame();
        for (int i = 0; i < 10; i++)
            s = s.StreamerVotes(VoteDirection.Right).CloseCard().NextCard(DateTime.UtcNow);
        s = s.EnterCriba().EliminateTier(0).EliminateTier(0);
        Assert.Single(s.EliminatedTiers);
    }
```

- [ ] **Step 2: Fail expected → implementar**

```csharp
    public GameState NextCard(DateTime now)
    {
        if (Phase != GamePhase.CardReveal) return this;
        var nextIdx = CardIndex + 1;
        if (Pack is null) return this;
        if (nextIdx >= Pack.Cards.Count)
        {
            return this with { Phase = GamePhase.TallyTransition, CardTimerEndsAt = null };
        }
        return this with
        {
            Phase = GamePhase.Card,
            CardIndex = nextIdx,
            CardTimerEndsAt = now.AddSeconds(CardSeconds),
            StreamerVote = null,
            CurrentCardVotes = new Dictionary<string, PlayerVote>()
        };
    }

    public GameState EnterCriba()
    {
        if (Phase != GamePhase.TallyTransition) return this;
        return this with { Phase = GamePhase.Criba, EliminatedTiers = Array.Empty<int>() };
    }

    public GameState EliminateTier(int tier)
    {
        if (Phase != GamePhase.Criba) return this;
        if (tier is < 0 or > 10) return this;
        if (EliminatedTiers.Contains(tier)) return this;
        var list = EliminatedTiers.ToList();
        list.Add(tier);
        return this with { EliminatedTiers = list };
    }
```

- [ ] **Step 3: Verde + commit**

```bash
dotnet test --filter GameStateTests
git add apps/api/Domain/GameState.cs apps/api.tests/GameStateTests.cs
git commit -m "feat(domain): NextCard, TallyTransition, Criba and EliminateTier"
```

#### Sub-task 12.6: Finalizar criba, calcular ganadores y bonus

- [ ] **Step 1: Tests**

```csharp
    [Fact]
    public void FinalizeCriba_returns_survivors_with_bonus_distributed()
    {
        var s = StartedGame(players: 4);
        for (int i = 0; i < 10; i++)
        {
            s = s.StreamerVotes(VoteDirection.Right);
            // u0 acierta 10, u1 acierta 7, u2 acierta 3, u3 acierta 0
            if (i < 10) s = s.ViewerVotes("u0", VoteDirection.Right, DateTime.UtcNow);
            if (i < 7)  s = s.ViewerVotes("u1", VoteDirection.Right, DateTime.UtcNow);
            if (i < 3)  s = s.ViewerVotes("u2", VoteDirection.Right, DateTime.UtcNow);
            // u3 no vota → 0 aciertos
            s = s.CloseCard().NextCard(DateTime.UtcNow);
        }
        s = s.EnterCriba()
            .EliminateTier(0).EliminateTier(1).EliminateTier(2).EliminateTier(3);
        // sobreviven u0 (10) y u1 (7)

        var result = s.FinalizeCriba();
        Assert.Equal(GamePhase.Victory, result.State.Phase);
        Assert.Equal(2, result.Survivors.Count);
        Assert.All(result.Survivors, w => Assert.Equal(50, w.Bonus));
        var u0 = result.Survivors.First(w => w.Nick == "u0");
        Assert.Equal(10 * 10 + 50, u0.TotalPoints);
    }

    [Fact]
    public void FinalizeCriba_with_no_survivors_returns_empty()
    {
        var s = StartedGame(players: 2);
        for (int i = 0; i < 10; i++)
            s = s.StreamerVotes(VoteDirection.Right).CloseCard().NextCard(DateTime.UtcNow);
        s = s.EnterCriba();
        for (int t = 0; t <= 10; t++) s = s.EliminateTier(t);
        var result = s.FinalizeCriba();
        Assert.Empty(result.Survivors);
    }
```

- [ ] **Step 2: Tipo de resultado y método**

Añadir un record arriba de `GameState`:
```csharp
public sealed record GameWinner(string Nick, int Aciertos, int Bonus, int TotalPoints);
public sealed record CribaResult(GameState State, IReadOnlyList<GameWinner> Survivors);
```

Y dentro de `GameState`:
```csharp
    public CribaResult FinalizeCriba()
    {
        if (Phase != GamePhase.Criba)
            throw new InvalidOperationException($"Cannot finalize criba from {Phase}");

        var survivors = AciertosByNick
            .Where(kv => !EliminatedTiers.Contains(kv.Value))
            .Select(kv => kv.Key)
            .ToList();

        var bonusPerHead = survivors.Count == 0 ? 0 : BonusPool / survivors.Count;

        var winners = survivors.Select(nick =>
        {
            var aciertos = AciertosByNick[nick];
            var total = aciertos * PointsPerHit + bonusPerHead;
            return new GameWinner(nick, aciertos, bonusPerHead, total);
        }).OrderByDescending(w => w.TotalPoints).ToList();

        var newState = this with { Phase = GamePhase.Victory };
        return new CribaResult(newState, winners);
    }
```

- [ ] **Step 3: Verde + commit**

```bash
dotnet test
git add apps/api/Domain/GameState.cs apps/api.tests/GameStateTests.cs
git commit -m "feat(domain): FinalizeCriba returns survivors with distributed bonus"
```

---

### Task 13: PackRepository — cargar packs desde JSON

**Files:**
- Create: `apps/api/Services/PackRepository.cs`
- Create: `apps/api/Packs/rpgs-clasicos.json`
- Create: `apps/api.tests/PackRepositoryTests.cs`

- [ ] **Step 1: Crear un pack JSON de ejemplo**

`apps/api/Packs/rpgs-clasicos.json`:
```json
{
  "id": "rpgs-clasicos",
  "name": "RPGs Clásicos",
  "question": "¿Lo has jugado entero?",
  "palettePrimary": "#c97aff",
  "paletteAccent": "#5fde6f",
  "cards": [
    { "id": "ffvii",    "imagePath": "/assets/packs/rpgs-clasicos/ffvii.png",    "subtitle": "Final Fantasy VII" },
    { "id": "chrono",   "imagePath": "/assets/packs/rpgs-clasicos/chrono.png",   "subtitle": "Chrono Trigger" },
    { "id": "earthbound","imagePath":"/assets/packs/rpgs-clasicos/earthbound.png","subtitle": "EarthBound" },
    { "id": "secret",   "imagePath": "/assets/packs/rpgs-clasicos/secret.png",   "subtitle": "Secret of Mana" },
    { "id": "tactics",  "imagePath": "/assets/packs/rpgs-clasicos/tactics.png",  "subtitle": "Final Fantasy Tactics" },
    { "id": "lufia",    "imagePath": "/assets/packs/rpgs-clasicos/lufia.png",    "subtitle": "Lufia II" },
    { "id": "phantasy", "imagePath": "/assets/packs/rpgs-clasicos/phantasy.png", "subtitle": "Phantasy Star IV" },
    { "id": "suikoden", "imagePath": "/assets/packs/rpgs-clasicos/suikoden.png", "subtitle": "Suikoden II" },
    { "id": "xenogears","imagePath": "/assets/packs/rpgs-clasicos/xenogears.png","subtitle": "Xenogears" },
    { "id": "ogre",     "imagePath": "/assets/packs/rpgs-clasicos/ogre.png",     "subtitle": "Tactics Ogre" }
  ]
}
```

Marca el JSON como Content Copy en csproj editando `apps/api/StreamerTinder.Api.csproj`:
```xml
<ItemGroup>
  <None Update="Packs\**\*.json">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

- [ ] **Step 2: Test**

`apps/api.tests/PackRepositoryTests.cs`:
```csharp
using StreamerTinder.Api.Services;

namespace StreamerTinder.Api.Tests;

public class PackRepositoryTests
{
    [Fact]
    public async Task LoadAll_returns_at_least_one_pack_with_10_cards()
    {
        var repo = new PackRepository(AppContext.BaseDirectory);
        await repo.LoadAllAsync();
        var packs = repo.GetAll();
        Assert.NotEmpty(packs);
        Assert.All(packs, p => Assert.Equal(10, p.Cards.Count));
    }

    [Fact]
    public async Task GetById_returns_specific_pack()
    {
        var repo = new PackRepository(AppContext.BaseDirectory);
        await repo.LoadAllAsync();
        var pack = repo.GetById("rpgs-clasicos");
        Assert.NotNull(pack);
        Assert.Equal("RPGs Clásicos", pack!.Name);
    }
}
```

- [ ] **Step 3: Implementar**

`apps/api/Services/PackRepository.cs`:
```csharp
using System.Text.Json;
using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Services;

public sealed class PackRepository
{
    private readonly string _baseDir;
    private readonly Dictionary<string, Pack> _packs = new();

    public PackRepository(string baseDir) => _baseDir = baseDir;

    public async Task LoadAllAsync()
    {
        var dir = Path.Combine(_baseDir, "Packs");
        if (!Directory.Exists(dir)) return;
        foreach (var file in Directory.GetFiles(dir, "*.json"))
        {
            await using var fs = File.OpenRead(file);
            var dto = await JsonSerializer.DeserializeAsync<PackDto>(fs, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            if (dto is null) continue;
            _packs[dto.Id] = new Pack(
                dto.Id, dto.Name, dto.Question,
                dto.PalettePrimary, dto.PaletteAccent,
                dto.Cards.Select(c => new Card(c.Id, c.ImagePath, c.Subtitle)).ToList());
        }
    }

    public IReadOnlyCollection<Pack> GetAll() => _packs.Values;
    public Pack? GetById(string id) => _packs.GetValueOrDefault(id);

    private sealed record PackDto(
        string Id, string Name, string Question,
        string? PalettePrimary, string? PaletteAccent,
        List<CardDto> Cards);
    private sealed record CardDto(string Id, string ImagePath, string? Subtitle);
}
```

- [ ] **Step 4: Registrar como singleton en `Program.cs`**

```csharp
builder.Services.AddSingleton(sp =>
{
    var repo = new PackRepository(AppContext.BaseDirectory);
    repo.LoadAllAsync().GetAwaiter().GetResult();
    return repo;
});
```

- [ ] **Step 5: Test + commit**

```bash
dotnet test --filter PackRepositoryTests
git add apps/api/ apps/api.tests/
git commit -m "feat(api): PackRepository loads packs from /Packs/*.json"
```

> **Nota**: las imágenes reales de las cartas (ffvii.png, etc.) **no** se incluyen en este task. Se añadirán en Phase 9 cuando se preparen los assets finales. En desarrollo puedes usar placeholders.

---

### Task 14: GameOrchestrator — máquina de estados thread-safe

**Files:**
- Create: `apps/api/Services/GameOrchestrator.cs`
- Create: `apps/api/Services/IGameStatePublisher.cs`
- Create: `apps/api.tests/GameOrchestratorTests.cs`

- [ ] **Step 1: Definir interfaz de publicación**

`apps/api/Services/IGameStatePublisher.cs`:
```csharp
using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Services;

public interface IGameStatePublisher
{
    Task PublishStateAsync(GameState state, CancellationToken ct = default);
    Task PublishWinnersAsync(IReadOnlyList<GameWinner> winners, CancellationToken ct = default);
}
```

- [ ] **Step 2: Tests para orchestrator (TDD)**

`apps/api.tests/GameOrchestratorTests.cs`:
```csharp
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.EntityFrameworkCore;
using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Infrastructure;
using StreamerTinder.Api.Services;

namespace StreamerTinder.Api.Tests;

public class GameOrchestratorTests
{
    private static (GameOrchestrator orch, AppDbContext db, FakePublisher pub) Build()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var db = new AppDbContext(opts);
        db.Database.EnsureCreated();
        var pub = new FakePublisher();
        var orch = new GameOrchestrator(pub, NullLogger<GameOrchestrator>.Instance);
        return (orch, db, pub);
    }

    private static Pack TestPack() =>
        new("test", "Test", "¿?", null, null,
            Enumerable.Range(0, 10).Select(i => new Card($"c{i}", $"/{i}.png", null)).ToList());

    [Fact]
    public async Task OpenLobby_publishes_state_in_lobby_phase()
    {
        var (orch, db, pub) = Build();
        await orch.OpenLobbyAsync(TestPack(), "adri", db);
        Assert.Equal(GamePhase.Lobby, pub.LastState!.Phase);
    }

    [Fact]
    public async Task Join_with_banned_nick_is_silently_ignored()
    {
        var (orch, db, pub) = Build();
        db.Bans.Add(new PersistedBan { TwitchUsername = "troll", BannedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        await orch.OpenLobbyAsync(TestPack(), "adri", db);
        await orch.HandleViewerCommandAsync("troll", new ChatCommand.Join(), db);
        Assert.Empty(pub.LastState!.LobbyPlayers);
    }

    private sealed class FakePublisher : IGameStatePublisher
    {
        public GameState? LastState { get; private set; }
        public IReadOnlyList<GameWinner>? LastWinners { get; private set; }
        public Task PublishStateAsync(GameState state, CancellationToken ct = default) {
            LastState = state; return Task.CompletedTask;
        }
        public Task PublishWinnersAsync(IReadOnlyList<GameWinner> w, CancellationToken ct = default) {
            LastWinners = w; return Task.CompletedTask;
        }
    }
}
```

- [ ] **Step 3: Implementar orchestrator**

`apps/api/Services/GameOrchestrator.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Infrastructure;

namespace StreamerTinder.Api.Services;

public sealed class GameOrchestrator
{
    private readonly IGameStatePublisher _pub;
    private readonly ILogger<GameOrchestrator> _log;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private GameState _state = GameState.New();
    private Guid? _currentGameId;
    private string _streamerUsername = "";
    private HashSet<string> _bansCache = new();

    public GameOrchestrator(IGameStatePublisher pub, ILogger<GameOrchestrator> log)
    {
        _pub = pub;
        _log = log;
    }

    public GameState CurrentState => _state;

    public async Task OpenLobbyAsync(Pack pack, string streamer, AppDbContext db, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _streamerUsername = streamer;
            _bansCache = (await db.Bans.Select(b => b.TwitchUsername).ToListAsync(ct)).ToHashSet();
            _state = _state.OpenLobby(pack, DateTime.UtcNow);
            _currentGameId = Guid.NewGuid();
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task HandleViewerCommandAsync(string nick, ChatCommand cmd, AppDbContext db, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var before = _state;
            _state = cmd switch
            {
                ChatCommand.Join => _state.Join(nick, DateTime.UtcNow, _bansCache.Contains(nick)),
                ChatCommand.Leave => _state.Leave(nick),
                ChatCommand.Vote v => _state.ViewerVotes(nick, v.Direction, DateTime.UtcNow),
                _ => _state
            };
            if (!ReferenceEquals(before, _state))
                await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task StreamerVoteAsync(VoteDirection dir, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.StreamerVotes(dir);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task CloseCardAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.CloseCard();
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task NextCardAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.NextCard(DateTime.UtcNow);
            await _pub.PublishStateAsync(_state, ct);
            if (_state.Phase == GamePhase.TallyTransition)
            {
                // dejamos 5s para la animación visual antes de pasar a criba
                _ = Task.Run(async () =>
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), ct);
                    await _lock.WaitAsync(ct);
                    try
                    {
                        _state = _state.EnterCriba();
                        await _pub.PublishStateAsync(_state, ct);
                    }
                    finally { _lock.Release(); }
                }, ct);
            }
        }
        finally { _lock.Release(); }
    }

    public async Task StartGameAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.StartGame(DateTime.UtcNow);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task EliminateTierAsync(int tier, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.EliminateTier(tier);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task FinalizeCribaAsync(AppDbContext db, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var result = _state.FinalizeCriba();
            _state = result.State;
            await PersistGameAsync(result.Survivors, db, ct);
            await _pub.PublishStateAsync(_state, ct);
            await _pub.PublishWinnersAsync(result.Survivors, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task BanAsync(string nick, AppDbContext db, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (!await db.Bans.AnyAsync(b => b.TwitchUsername == nick, ct))
            {
                db.Bans.Add(new PersistedBan { TwitchUsername = nick, BannedAt = DateTime.UtcNow });
                await db.SaveChangesAsync(ct);
                _bansCache.Add(nick);
            }
            _state = _state.Leave(nick);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    public async Task VaciarLobbyAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            _state = _state.VaciarLobby(DateTime.UtcNow);
            await _pub.PublishStateAsync(_state, ct);
        }
        finally { _lock.Release(); }
    }

    private async Task PersistGameAsync(IReadOnlyList<GameWinner> winners, AppDbContext db, CancellationToken ct)
    {
        if (_currentGameId is null || _state.Pack is null) return;

        var game = new PersistedGame
        {
            Id = _currentGameId.Value,
            PackId = _state.Pack.Id,
            StartedAt = DateTime.UtcNow,  // simplificado para v1
            EndedAt = DateTime.UtcNow,
            StreamerUsername = _streamerUsername,
            Status = "finished"
        };

        foreach (var (nick, aciertos) in _state.AciertosByNick)
        {
            var survived = winners.Any(w => w.Nick == nick);
            var bonus = winners.FirstOrDefault(w => w.Nick == nick)?.Bonus ?? 0;
            game.Participants.Add(new PersistedGameParticipant
            {
                GameId = game.Id,
                TwitchUsername = nick,
                JoinedAt = DateTime.UtcNow,
                FinalScore = aciertos,
                SurvivedCriba = survived,
                BonusEarned = bonus
            });

            var existing = await db.Scores.FindAsync(new object?[] { nick }, ct);
            if (existing is null)
            {
                db.Scores.Add(new PersistedScore
                {
                    TwitchUsername = nick,
                    TotalPoints = aciertos * GameState.PointsPerHit + bonus,
                    GamesPlayed = 1,
                    GamesWon = survived ? 1 : 0,
                    LastPlayedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.TotalPoints += aciertos * GameState.PointsPerHit + bonus;
                existing.GamesPlayed++;
                if (survived) existing.GamesWon++;
                existing.LastPlayedAt = DateTime.UtcNow;
            }
        }

        db.Games.Add(game);
        await db.SaveChangesAsync(ct);
        _log.LogInformation("Persisted game {GameId} with {Count} participants", game.Id, game.Participants.Count);
    }
}
```

- [ ] **Step 4: Registrar como singleton en `Program.cs`**

```csharp
builder.Services.AddSingleton<GameOrchestrator>();
```

Y la implementación de `IGameStatePublisher` (la haremos en Task 17 con SignalR; por ahora un stub):

```csharp
builder.Services.AddSingleton<IGameStatePublisher, NoopPublisher>();
```

Crea temporal `apps/api/Services/NoopPublisher.cs`:
```csharp
using StreamerTinder.Api.Domain;

namespace StreamerTinder.Api.Services;

public sealed class NoopPublisher : IGameStatePublisher
{
    public Task PublishStateAsync(GameState s, CancellationToken ct = default) => Task.CompletedTask;
    public Task PublishWinnersAsync(IReadOnlyList<GameWinner> w, CancellationToken ct = default) => Task.CompletedTask;
}
```

- [ ] **Step 5: Tests pasan + commit**

```bash
dotnet add apps/api.tests/StreamerTinder.Api.Tests.csproj package Microsoft.EntityFrameworkCore.InMemory --version 8.0.*
dotnet test
git add apps/api/ apps/api.tests/
git commit -m "feat(api): GameOrchestrator with thread-safe state and DB persistence"
```

---

# Phase 3 — Twitch IRC integration

### Task 15: Hosted service que conecta a IRC y publica comandos

**Files:**
- Create: `apps/api/Services/TwitchChatService.cs`
- Modify: `apps/api/StreamerTinder.Api.csproj`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Instalar TwitchLib.Client**

```bash
cd apps/api
dotnet add package TwitchLib.Client --version 4.*
```

- [ ] **Step 2: Implementar el hosted service**

`apps/api/Services/TwitchChatService.cs`:
```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StreamerTinder.Api.Infrastructure;
using TwitchLib.Client;
using TwitchLib.Client.Models;
using TwitchLib.Communication.Clients;
using TwitchLib.Communication.Models;

namespace StreamerTinder.Api.Services;

public sealed class TwitchChatService : BackgroundService
{
    private readonly TwitchOptions _opts;
    private readonly ChatCommandParser _parser;
    private readonly GameOrchestrator _orch;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<TwitchChatService> _log;
    private TwitchClient? _client;

    public TwitchChatService(
        IOptions<TwitchOptions> opts,
        ChatCommandParser parser,
        GameOrchestrator orch,
        IServiceScopeFactory scopes,
        ILogger<TwitchChatService> log)
    {
        _opts = opts.Value;
        _parser = parser;
        _orch = orch;
        _scopes = scopes;
        _log = log;
    }

    protected override Task ExecuteAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_opts.Channel) || _opts.Channel == "your_channel_here")
        {
            _log.LogWarning("Twitch channel not configured. IRC service idle.");
            return Task.CompletedTask;
        }

        var botNick = string.IsNullOrWhiteSpace(_opts.BotNick)
            ? $"justinfan{Random.Shared.Next(10000, 99999)}"
            : _opts.BotNick;

        var creds = new ConnectionCredentials(botNick, "");
        var wsOpts = new ClientOptions
        {
            MessagesAllowedInPeriod = 750,
            ThrottlingPeriod = TimeSpan.FromSeconds(30)
        };
        var ws = new WebSocketClient(wsOpts);
        _client = new TwitchClient(ws);
        _client.Initialize(creds, _opts.Channel);

        _client.OnConnected += (_, _) => _log.LogInformation("Twitch IRC connected as {Bot} to {Channel}", botNick, _opts.Channel);
        _client.OnDisconnected += (_, _) => _log.LogWarning("Twitch IRC disconnected");
        _client.OnMessageReceived += OnMessage;

        _client.Connect();
        return Task.CompletedTask;
    }

    private void OnMessage(object? sender, TwitchLib.Client.Events.OnMessageReceivedArgs e)
    {
        var nick = e.ChatMessage.Username;
        var msg = e.ChatMessage.Message;
        var cmd = _parser.Parse(msg);
        if (cmd is ChatCommand.Unknown) return;

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await _orch.HandleViewerCommandAsync(nick, cmd, db);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Error handling chat command from {Nick}: {Msg}", nick, msg);
            }
        });
    }

    public override Task StopAsync(CancellationToken ct)
    {
        try { _client?.Disconnect(); } catch { /* swallow */ }
        return base.StopAsync(ct);
    }
}
```

- [ ] **Step 3: Registrar parser y servicio en `Program.cs`**

```csharp
builder.Services.AddSingleton<ChatCommandParser>();
builder.Services.AddHostedService<TwitchChatService>();
```

- [ ] **Step 4: Verificar build y commit**

```bash
dotnet build
git add apps/api/
git commit -m "feat(api): TwitchChatService hosted service with anonymous IRC connection"
```

---

# Phase 4 — SignalR hub

### Task 16: SignalR hub + reemplazar NoopPublisher

**Files:**
- Create: `apps/api/Hubs/GameHub.cs`
- Create: `apps/api/Services/SignalRGamePublisher.cs`
- Modify: `apps/api/Program.cs`
- Delete: `apps/api/Services/NoopPublisher.cs`

- [ ] **Step 1: Instalar SignalR**

```bash
cd apps/api
dotnet add package Microsoft.AspNetCore.SignalR --version 1.2.*
```

(Está incluido en ASP.NET Core; el paquete instala lo necesario para hubs.)

- [ ] **Step 2: Crear hub**

`apps/api/Hubs/GameHub.cs`:
```csharp
using Microsoft.AspNetCore.SignalR;
using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Infrastructure;
using StreamerTinder.Api.Services;

namespace StreamerTinder.Api.Hubs;

public sealed class GameHub : Hub
{
    private readonly GameOrchestrator _orch;
    private readonly PackRepository _packs;

    public GameHub(GameOrchestrator orch, PackRepository packs)
    {
        _orch = orch;
        _packs = packs;
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
        await Clients.Caller.SendAsync("state", _orch.CurrentState);
    }

    public Task<IReadOnlyCollection<Pack>> ListPacks() => Task.FromResult(_packs.GetAll());

    public async Task OpenLobby(string packId, string streamerNick, AppDbContext db)
    {
        var pack = _packs.GetById(packId);
        if (pack is null) return;
        await _orch.OpenLobbyAsync(pack, streamerNick, db);
    }

    public Task StartGame() => _orch.StartGameAsync();
    public Task StreamerVote(string direction) =>
        _orch.StreamerVoteAsync(direction == "left" ? VoteDirection.Left : VoteDirection.Right);
    public Task CloseCard() => _orch.CloseCardAsync();
    public Task NextCard() => _orch.NextCardAsync();
    public Task EliminateTier(int tier) => _orch.EliminateTierAsync(tier);
    public Task FinalizeCriba(AppDbContext db) => _orch.FinalizeCribaAsync(db);
    public Task Ban(string nick, AppDbContext db) => _orch.BanAsync(nick, db);
    public Task VaciarLobby() => _orch.VaciarLobbyAsync();
}
```

> Nota: AppDbContext debe inyectarse desde el scope correcto al invocar los métodos. SignalR resuelve por DI tradicional; los métodos cuyos parámetros son DI los recibe directamente porque ASP.NET Core los inyecta vía `[FromServices]`. Si esto da problema en runtime, mover `db` a una fábrica interna del orchestrator.

- [ ] **Step 3: Implementar publisher SignalR**

`apps/api/Services/SignalRGamePublisher.cs`:
```csharp
using Microsoft.AspNetCore.SignalR;
using StreamerTinder.Api.Domain;
using StreamerTinder.Api.Hubs;

namespace StreamerTinder.Api.Services;

public sealed class SignalRGamePublisher : IGameStatePublisher
{
    private readonly IHubContext<GameHub> _hub;
    public SignalRGamePublisher(IHubContext<GameHub> hub) => _hub = hub;

    public Task PublishStateAsync(GameState s, CancellationToken ct = default) =>
        _hub.Clients.All.SendAsync("state", s, ct);

    public Task PublishWinnersAsync(IReadOnlyList<GameWinner> winners, CancellationToken ct = default) =>
        _hub.Clients.All.SendAsync("winners", winners, ct);
}
```

- [ ] **Step 4: Borrar NoopPublisher y registrar SignalRPublisher**

```bash
rm apps/api/Services/NoopPublisher.cs
```

En `Program.cs` reemplazar la línea `builder.Services.AddSingleton<IGameStatePublisher, NoopPublisher>();` por:
```csharp
builder.Services.AddSignalR().AddJsonProtocol(opts =>
{
    opts.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddSingleton<IGameStatePublisher, SignalRGamePublisher>();
```

Y al final del pipeline (antes de `MapFallbackToFile`):
```csharp
app.MapHub<GameHub>("/hubs/game");
```

- [ ] **Step 5: Verificar build + commit**

```bash
dotnet build
git add apps/api/
git commit -m "feat(api): SignalR hub /hubs/game with publisher implementation"
```

---

# Phase 5 — Frontend foundation

### Task 17: Copiar tokens.css, instalar fuentes y configurar Angular

**Files:**
- Create: `apps/web/src/tokens.scss`
- Modify: `apps/web/src/styles.scss`
- Modify: `apps/web/src/index.html`

- [ ] **Step 1: Copiar tokens del handoff a SCSS literal**

```bash
cp /c/dev/twitch-tinder/docs/design-handoff/prototypes/assets/tokens.css \
   /c/dev/twitch-tinder/apps/web/src/tokens.scss
```

- [ ] **Step 2: Importar tokens y configurar reset pixel-perfect en `styles.scss`**

`apps/web/src/styles.scss`:
```scss
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
@import './tokens.scss';

* {
  box-sizing: border-box;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
  font-smooth: never;
  image-rendering: pixelated;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--c-night);
  color: var(--c-bone);
  font-family: var(--font-body);
  font-size: var(--fs-body);
  min-height: 100vh;
}

button {
  font-family: var(--font-title);
  cursor: pointer;
}
```

- [ ] **Step 3: Modificar `index.html` para pixel rendering**

Reemplazar `<body>` en `apps/web/src/index.html`:
```html
<body style="background: #1a1428;">
  <app-root></app-root>
</body>
```

- [ ] **Step 4: Build verifica y commit**

```bash
cd apps/web && npm run build
git add apps/web/src/
git commit -m "feat(web): import tokens.scss from handoff, configure pixel rendering"
```

---

### Task 18: Definir rutas y componentes shell

**Files:**
- Modify: `apps/web/src/app/app.routes.ts`
- Create: `apps/web/src/app/overlay/overlay.component.ts`
- Create: `apps/web/src/app/streamer/streamer.component.ts`
- Create: `apps/web/src/app/leaderboard/leaderboard.component.ts`

- [ ] **Step 1: Rutas**

`apps/web/src/app/app.routes.ts`:
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'overlay', pathMatch: 'full' },
  { path: 'overlay', loadComponent: () => import('./overlay/overlay.component').then(m => m.OverlayComponent) },
  { path: 'streamer', loadComponent: () => import('./streamer/streamer.component').then(m => m.StreamerComponent) },
  { path: 'leaderboard', loadComponent: () => import('./leaderboard/leaderboard.component').then(m => m.LeaderboardComponent) }
];
```

- [ ] **Step 2: Componentes shell mínimos**

`apps/web/src/app/overlay/overlay.component.ts`:
```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-overlay',
  standalone: true,
  template: `<div class="overlay-shell">OVERLAY (pendiente)</div>`,
  styles: `.overlay-shell { padding: 64px; font-family: var(--font-title); }`
})
export class OverlayComponent {}
```

`apps/web/src/app/streamer/streamer.component.ts`:
```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-streamer',
  standalone: true,
  template: `<div>PANEL STREAMER (pendiente)</div>`
})
export class StreamerComponent {}
```

`apps/web/src/app/leaderboard/leaderboard.component.ts`:
```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  template: `<div>LEADERBOARD (pendiente)</div>`
})
export class LeaderboardComponent {}
```

- [ ] **Step 3: Build + verifica las 3 rutas a mano + commit**

```bash
cd /c/dev/twitch-tinder/apps/web && npm run build
cd /c/dev/twitch-tinder && dotnet run --project apps/api &
sleep 3
curl -s http://localhost:5xxx/overlay | grep "overlay-shell"
curl -s -u streamer:change-me-in-production http://localhost:5xxx/streamer | head -5
kill %1

git add apps/web/src/app/
git commit -m "feat(web): scaffold overlay, streamer and leaderboard route shells"
```

---

### Task 19: Portar sprite.js a TypeScript con tests

**Files:**
- Create: `apps/web/src/app/ui/sprite/sprite.engine.ts`
- Create: `apps/web/src/app/ui/sprite/sprite.engine.spec.ts`

- [ ] **Step 1: Portar el engine — tipos**

`apps/web/src/app/ui/sprite/sprite.engine.ts`:
```typescript
// Port de docs/design-handoff/prototypes/assets/sprite.js a TypeScript.
// MANTENER el algoritmo idéntico: cualquier desviación rompe la propiedad
// "mismo nick -> mismo sprite" requerida por el spec.

export const BODY_COLORS = [
  '#ff3c8b', '#4ad4d4', '#5fde6f', '#ffd33d',
  '#c97aff', '#ff8a3d', '#6a8aff', '#ffffff'
];
export const SKIN_COLORS = ['#ffd5b0', '#e8a878', '#a06a3a', '#5a3a1f'];
export const HAIR_COLORS = ['#2a1810', '#6b3a1a', '#d4a23d', '#b8341f', '#4a4a6a', '#ff3c8b'];
export const PANTS_COLORS = ['#3a2a5a', '#1f3a5a', '#5a3a1f', '#2a2a2a'];
export const POSES = ['idle', 'arms_up', 'wave', 'cheer', 'point', 'hands_hips'] as const;

export type Pose = typeof POSES[number];
export type State = 'normal' | 'voted' | 'eliminated' | 'winner';

export interface SpriteSpec {
  body: string;
  skin: string;
  hair: string;
  pants: string;
  pose: Pose;
  hasHat: boolean;
  hash: number;
}

export function hashNick(nick: string): number {
  let h = 5381 >>> 0;
  const s = (nick ?? '').toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function spriteFor(nick: string, packPalette?: string[]): SpriteSpec {
  const h = hashNick(nick);
  const palette = packPalette ?? BODY_COLORS;
  return {
    body:   palette[h % palette.length],
    skin:   SKIN_COLORS[(h >>> 3) % SKIN_COLORS.length],
    hair:   HAIR_COLORS[(h >>> 6) % HAIR_COLORS.length],
    pants:  PANTS_COLORS[(h >>> 9) % PANTS_COLORS.length],
    pose:   POSES[(h >>> 12) % POSES.length],
    hasHat: ((h >>> 15) & 1) === 1,
    hash:   h
  };
}

// Render del sprite a un canvas 24x30.
// Replica EXACTA del pixel buffer de sprite.js — copiar el contenido del archivo
// `docs/design-handoff/prototypes/assets/sprite.js` función `makePoseBuffer`
// y portar a TS aquí (~300 líneas de pixels indexados).
export function renderSprite(
  ctx: CanvasRenderingContext2D,
  spec: SpriteSpec,
  state: State = 'normal'
): void {
  // TODO en implementación: copiar makePoseBuffer + paintBuffer de sprite.js.
  // El task 19b cubre esta parte porque es mecánica y voluminosa.
  throw new Error('renderSprite not yet implemented — see task 19b');
}
```

- [ ] **Step 2: Test del hash determinista (es la parte crítica de portabilidad)**

`apps/web/src/app/ui/sprite/sprite.engine.spec.ts`:
```typescript
import { hashNick, spriteFor, BODY_COLORS } from './sprite.engine';

describe('hashNick', () => {
  it('is deterministic and case-insensitive', () => {
    expect(hashNick('Adri')).toBe(hashNick('adri'));
    expect(hashNick('Adri')).toBe(hashNick('ADRI'));
  });

  it('returns same hash on repeated calls', () => {
    const a = hashNick('lara99');
    const b = hashNick('lara99');
    expect(a).toBe(b);
  });

  it('produces an unsigned 32-bit number', () => {
    const h = hashNick('verylongnickname1234');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe('spriteFor', () => {
  it('returns same sprite for same nick', () => {
    const a = spriteFor('adri');
    const b = spriteFor('adri');
    expect(a).toEqual(b);
  });

  it('uses pack palette when provided', () => {
    const customPalette = ['#000000', '#111111'];
    const s = spriteFor('adri', customPalette);
    expect(customPalette).toContain(s.body);
  });

  it('falls back to BODY_COLORS when no palette', () => {
    const s = spriteFor('adri');
    expect(BODY_COLORS).toContain(s.body);
  });
});
```

- [ ] **Step 3: Verificar tests verdes**

```bash
cd apps/web && npm test -- --watch=false
# Expected: 6 tests passing
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/ui/sprite/
git commit -m "feat(web): port hashNick and spriteFor from handoff to TypeScript"
```

#### Task 19b: Portar makePoseBuffer + renderSprite completos

Esta es la parte mecánica. Abre `docs/design-handoff/prototypes/assets/sprite.js` y copia las funciones `makePoseBuffer` (~250 líneas) y la función render que pinta `buf` al canvas. Convierte:
- `const W = 24, H = 30` → mismo
- pose tags string → mismo
- `function makePoseBuffer(spec, pose)` → función exportada en TS con tipos
- Función render → toma `ctx: CanvasRenderingContext2D` y dibuja píxel a píxel
- Outline pass (segunda pasada que pone ink en píxeles transparentes con vecino opaco): copiar idéntica

Al terminar, escribir un test de sanity check:
```typescript
it('renderSprite produces non-empty canvas data', () => {
  const canvas = document.createElement('canvas');
  canvas.width = 24; canvas.height = 30;
  const ctx = canvas.getContext('2d')!;
  renderSprite(ctx, spriteFor('adri'));
  const data = ctx.getImageData(0, 0, 24, 30).data;
  // al menos un pixel debe ser no-transparente
  let nonAlpha = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) nonAlpha++;
  expect(nonAlpha).toBeGreaterThan(50);
});
```

Commit:
```bash
git add apps/web/src/app/ui/sprite/sprite.engine.ts apps/web/src/app/ui/sprite/sprite.engine.spec.ts
git commit -m "feat(web): port makePoseBuffer and renderSprite from handoff"
```

---

### Task 20: SpriteComponent (presentación)

**Files:**
- Create: `apps/web/src/app/ui/sprite/sprite.component.ts`

- [ ] **Step 1: Componente**

```typescript
import { Component, ElementRef, Input, OnChanges, ViewChild, signal } from '@angular/core';
import { renderSprite, spriteFor, State } from './sprite.engine';

@Component({
  selector: 'app-sprite',
  standalone: true,
  template: `
    <div class="sprite-wrap" [style.--scale]="scale">
      <canvas #c width="24" height="30"></canvas>
      <span class="nick">{{ nick }}</span>
    </div>
  `,
  styles: `
    .sprite-wrap { display: inline-flex; flex-direction: column; align-items: center; gap: var(--u); }
    canvas {
      width: calc(24px * var(--scale, 2));
      height: calc(30px * var(--scale, 2));
      image-rendering: pixelated;
    }
    .nick {
      font-family: var(--font-title);
      font-size: var(--fs-xs);
      color: var(--c-bone);
      text-shadow: 1px 1px 0 var(--c-void);
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `
})
export class SpriteComponent implements OnChanges {
  @Input() nick = '';
  @Input() scale = 2;
  @Input() state: State = 'normal';
  @Input() packPalette?: string[];
  @ViewChild('c', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  ngOnChanges(): void {
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 24, 30);
    renderSprite(ctx, spriteFor(this.nick, this.packPalette), this.state);
  }
}
```

- [ ] **Step 2: Verifica visualmente y commit**

Importa SpriteComponent temporalmente en `OverlayComponent` y renderiza 3 sprites con nicks distintos. Visita `http://localhost:5xxx/overlay` y comprueba que ves 3 personajes pixelados diferentes con su nick debajo. Después remueve el debugging.

```bash
git add apps/web/src/app/ui/sprite/sprite.component.ts
git commit -m "feat(web): SpriteComponent rendering 24x30 sprite to canvas"
```

---

### Task 21: SignalR service + GameState store

**Files:**
- Create: `apps/web/src/app/core/signalr.service.ts`
- Create: `apps/web/src/app/core/game-state.store.ts`

- [ ] **Step 1: Instalar cliente SignalR**

```bash
cd apps/web
npm install @microsoft/signalr@8
```

- [ ] **Step 2: Servicio**

`apps/web/src/app/core/signalr.service.ts`:
```typescript
import { Injectable, OnDestroy, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {
  private conn?: signalR.HubConnection;
  readonly connected = signal(false);

  async connect(onState: (s: unknown) => void, onWinners: (w: unknown) => void): Promise<void> {
    if (this.conn) return;
    this.conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/game')
      .withAutomaticReconnect()
      .build();

    this.conn.on('state', onState);
    this.conn.on('winners', onWinners);
    this.conn.onreconnected(() => this.connected.set(true));
    this.conn.onclose(() => this.connected.set(false));

    await this.conn.start();
    this.connected.set(true);
  }

  invoke<T = void>(method: string, ...args: unknown[]): Promise<T> {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.invoke<T>(method, ...args);
  }

  async ngOnDestroy(): Promise<void> {
    await this.conn?.stop();
  }
}
```

- [ ] **Step 3: Store**

`apps/web/src/app/core/game-state.store.ts`:
```typescript
import { Injectable, signal, computed } from '@angular/core';

export type GamePhase =
  | 'idle' | 'lobby' | 'card' | 'cardReveal'
  | 'tallyTransition' | 'criba' | 'victory';

export interface GameStateDto {
  phase: GamePhase;
  pack?: { id: string; name: string; question: string; palettePrimary?: string; paletteAccent?: string };
  cardIndex: number;
  cardTimerEndsAt?: string;
  streamerVote?: 'left' | 'right';
  lobbyPlayers: { nick: string; joinedAt: string }[];
  lobbyCountdownEndsAt?: string;
  currentCardVotes: Record<string, { direction: 'left' | 'right' }>;
  aciertosByNick: Record<string, number>;
  eliminatedTiers: number[];
}

export interface GameWinnerDto {
  nick: string;
  aciertos: number;
  bonus: number;
  totalPoints: number;
}

@Injectable({ providedIn: 'root' })
export class GameStateStore {
  readonly state = signal<GameStateDto | null>(null);
  readonly winners = signal<GameWinnerDto[]>([]);
  readonly phase = computed(() => this.state()?.phase ?? 'idle');
}
```

- [ ] **Step 4: Conectar en bootstrap del overlay**

En `app.config.ts` añadir el bootstrap. Pero como conectamos por componente, lo haremos en cada superficie en sus tasks correspondientes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/core/ apps/web/package.json apps/web/package-lock.json
git commit -m "feat(web): SignalR service + GameStateStore with typed DTOs"
```

---

# Phase 6 — Overlay phases

Las próximas 7 tareas (22-28) implementan cada fase visual del overlay. Cada una sigue el mismo patrón: leer el HTML del prototipo correspondiente en `docs/design-handoff/prototypes/overlay.html`, identificar la sección de esa fase, portar el markup a un componente Angular standalone, conectar al `GameStateStore` para los datos dinámicos.

### Task 22: OverlayComponent shell con switch por fase

**Files:**
- Modify: `apps/web/src/app/overlay/overlay.component.ts`
- Create (placeholders): `apps/web/src/app/overlay/phases/phase-{idle,lobby,card,card-reveal,tally,criba,victory}.component.ts`

- [ ] **Step 1: Crear los 7 placeholders mínimos**

Para cada fase, crear el componente con sólo `template: `<div>FASE X</div>`` por ahora. Por ejemplo:

`apps/web/src/app/overlay/phases/phase-idle.component.ts`:
```typescript
import { Component } from '@angular/core';
@Component({ selector: 'phase-idle', standalone: true, template: `<div>IDLE</div>` })
export class PhaseIdleComponent {}
```

Repite para `phase-lobby`, `phase-card`, `phase-card-reveal`, `phase-tally`, `phase-criba`, `phase-victory`.

- [ ] **Step 2: OverlayComponent con switch**

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { SignalRService } from '../core/signalr.service';
import { GameStateStore } from '../core/game-state.store';
import { PhaseIdleComponent } from './phases/phase-idle.component';
import { PhaseLobbyComponent } from './phases/phase-lobby.component';
import { PhaseCardComponent } from './phases/phase-card.component';
import { PhaseCardRevealComponent } from './phases/phase-card-reveal.component';
import { PhaseTallyComponent } from './phases/phase-tally.component';
import { PhaseCribaComponent } from './phases/phase-criba.component';
import { PhaseVictoryComponent } from './phases/phase-victory.component';

@Component({
  selector: 'app-overlay',
  standalone: true,
  imports: [
    PhaseIdleComponent, PhaseLobbyComponent, PhaseCardComponent,
    PhaseCardRevealComponent, PhaseTallyComponent, PhaseCribaComponent, PhaseVictoryComponent
  ],
  template: `
    @switch (store.phase()) {
      @case ('idle')            { <phase-idle/> }
      @case ('lobby')           { <phase-lobby/> }
      @case ('card')            { <phase-card/> }
      @case ('cardReveal')      { <phase-card-reveal/> }
      @case ('tallyTransition') { <phase-tally/> }
      @case ('criba')           { <phase-criba/> }
      @case ('victory')         { <phase-victory/> }
    }
  `
})
export class OverlayComponent implements OnInit {
  protected store = inject(GameStateStore);
  private sr = inject(SignalRService);

  async ngOnInit(): Promise<void> {
    await this.sr.connect(
      (s) => this.store.state.set(s as any),
      (w) => this.store.winners.set(w as any)
    );
  }
}
```

- [ ] **Step 3: Build + verifica que la app conecta (logs en consola del navegador)**

```bash
cd apps/web && npm run build
cd /c/dev/twitch-tinder && dotnet run --project apps/api
# Abre http://localhost:5xxx/overlay
# Deberías ver "IDLE" y en devtools ver el WS conectado
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/overlay/
git commit -m "feat(web): OverlayComponent shell with phase switching and SignalR bind"
```

---

### Tasks 23-28: implementar cada fase del overlay

Las próximas seis tareas siguen este patrón fijo. Para cada una:

1. Abre `docs/design-handoff/prototypes/overlay.html` y localiza la sección correspondiente (los IDs y comentarios ayudan).
2. Copia el HTML + CSS (los estilos son tokens, así que sólo referencias `var(--c-...)`).
3. Portea a Angular en un solo archivo `.component.ts` con `template:` y `styles:`.
4. Reemplaza los datos hardcodeados del prototipo por bindings al `GameStateStore` (`store.state()?.cardIndex`, etc.).
5. Para listados de avatares usa `<app-sprite>` con el `nick` correspondiente.
6. Verifica visualmente en el navegador.
7. Commit.

**Resumen rápido de cada fase:**

| Task | Fase | Datos del store consumidos | Cosas a no olvidar |
|---|---|---|---|
| 23 | `phase-idle` | nada | bobbing animation, "STAND BY" |
| 24 | `phase-lobby` | `lobbyPlayers[]`, `lobbyCountdownEndsAt`, `pack.question` | countdown reactivo cada segundo |
| 25 | `phase-card` | `pack.question`, current `card`, `cardTimerEndsAt`, `streamerVote` (para pulse), `currentCardVotes` (recuentos) | timer animado, "streamer ya votó" pulse cuando `streamerVote != null` |
| 26 | `phase-card-reveal` | `streamerVote`, conteo de aciertos | sprite del streamer en cheer pose |
| 27 | `phase-tally` | `aciertosByNick`, `lobbyPlayers` (para nicks) | animación de migración 5s con `@keyframes migrate-in` |
| 28 | `phase-criba` | `aciertosByNick`, `eliminatedTiers`, computed survivors | 11 columnas, dim+grayscale en eliminadas, barra inferior bonus |
| 29 | `phase-victory` | `winners[]` | confeti animado, leaderboard de partida |

Cada task tiene los mismos sub-pasos (test visual + commit), así que no los repito. **Commits sugeridos:**
- `feat(web): phase-idle with bobbing pacers and STAND BY title`
- `feat(web): phase-lobby with countdown and avatar grid bound to store`
- ...etc.

> **Cuidado especial en `phase-criba`** (Task 28): el cálculo de "supervivientes actuales" y "bonus por superviviente" debe ser un `computed()` reactivo derivado de `store.state()`. Fórmula: `100 / Math.max(1, survivors.length)`. Cuando `state.eliminatedTiers` cambia, el bonus se recalcula automáticamente.

---

# Phase 7 — Streamer panel

Mismo enfoque que Phase 6, pero esta vez la base es `docs/design-handoff/prototypes/streamer.html`.

### Task 30: StreamerComponent shell

**Files:**
- Modify: `apps/web/src/app/streamer/streamer.component.ts`
- Create: `apps/web/src/app/streamer/controls/controls-{idle,lobby,card,criba,victory}.component.ts`

Equivalente al Task 22 pero para el panel. El switch invoca controles por fase. El componente conecta al mismo hub.

Diferencia clave: aquí el componente debe **invocar métodos del hub** ante interacciones del usuario (clics en botones). Para eso:

```typescript
// dentro de ControlsLobbyComponent
private sr = inject(SignalRService);
async start() { await this.sr.invoke('StartGame'); }
async ban(nick: string) { await this.sr.invoke('Ban', nick); }
async vaciar() { await this.sr.invoke('VaciarLobby'); }
```

### Tasks 31-36: controles por fase

Una tarea por componente de controles. Cada uno expone los botones de su fase llamando a métodos del hub.

| Task | Componente | Acciones del hub |
|---|---|---|
| 31 | `controls-idle` | `OpenLobby(packId, streamerNick)` con dropdown de packs |
| 32 | `controls-lobby` | `StartGame`, `Ban`, `VaciarLobby` |
| 33 | `controls-card` | `StreamerVote('left'|'right')`, `CloseCard` (visible tras votar) |
| 34 | `controls-card-reveal` | `NextCard` |
| 35 | `controls-criba` | `EliminateTier(N)` × 11, `FinalizeCriba` |
| 36 | `controls-victory` | `OpenLobby(samePack)`, `OpenLobby(otherPack)`, cerrar sesión (back a idle) |

Para cada uno: portar markup del prototipo, bindear botones, test manual.

---

# Phase 8 — Leaderboard page

### Task 37: LeaderboardComponent con query API

**Files:**
- Modify: `apps/web/src/app/leaderboard/leaderboard.component.ts`

- [ ] **Step 1: Componente**

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

interface Row {
  rank: number; nick: string; points: number; games: number; wins: number; last_played_at: string;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  template: `
    <div class="lb-wrap">
      <h1>LEADERBOARD</h1>
      <input type="text" [value]="search()" (input)="onSearch($any($event.target).value)" placeholder="soy @nick" />
      <table>
        <thead>
          <tr><th>#</th><th>Nick</th><th>Pts</th><th>Partidas</th><th>Ganadas</th></tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.nick) {
            <tr [class.me]="r.nick.toLowerCase() === search().toLowerCase()">
              <td>{{ r.rank }}</td>
              <td>{{ r.nick }}</td>
              <td>{{ r.points }}</td>
              <td>{{ r.games }}</td>
              <td>{{ r.wins }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .lb-wrap { padding: var(--u4); }
    h1 { font-family: var(--font-title); color: var(--c-flame); }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
    th, td { padding: var(--u2); border-bottom: var(--border-1) solid var(--c-stone); }
    th { font-family: var(--font-title); font-size: var(--fs-sm); color: var(--c-ash); text-align: left; }
    tr.me { background: var(--c-flame-dk); color: var(--c-paper); }
    input { font-family: var(--font-body); font-size: var(--fs-body); padding: var(--u); background: var(--c-dusk); color: var(--c-bone); border: var(--border-1) solid var(--c-stone); margin-bottom: var(--u2); }
  `
})
export class LeaderboardComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  rows = signal<Row[]>([]);
  search = signal<string>('');

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe(q => {
      const hl = q.get('highlight');
      if (hl) this.search.set(hl);
    });
    const resp = await fetch('/api/leaderboard?limit=100&offset=0');
    const json = await resp.json();
    this.rows.set(json.rows);
  }

  onSearch(value: string) { this.search.set(value); }
}
```

- [ ] **Step 2: Habilitar HttpClient + commit**

En `apps/web/src/app/app.config.ts`:
```typescript
import { provideHttpClient } from '@angular/common/http';
// ...
providers: [provideRouter(routes), provideHttpClient()]
```

```bash
cd apps/web && npm run build
git add apps/web/src/app/
git commit -m "feat(web): LeaderboardComponent with highlight by nick and query param"
```

---

# Phase 9 — Packs + deployment

### Task 38: Crear 2 packs adicionales y placeholders de imágenes

**Files:**
- Create: `apps/api/Packs/pizza-toppings.json`
- Create: `apps/api/Packs/comida-asquerosa.json`
- Create: `apps/api/wwwroot/assets/packs/...` placeholders

- [ ] **Step 1: Crear los dos packs JSON** (siguiendo el esquema de Task 13)
- [ ] **Step 2: Generar 30 placeholders PNG de 256x256** con texto del ID de la carta (puedes usar ImageMagick: `convert -size 256x256 xc:gray -gravity center -annotate +0+0 "CARD ID" out.png`).
- [ ] **Step 3: Commit**

```bash
git add apps/api/Packs/ apps/api/wwwroot/assets/packs/
git commit -m "feat(api): seed pizza-toppings and comida-asquerosa packs with placeholders"
```

---

### Task 39: Configurar Azure App Service (manual, no script)

- [ ] **Step 1: Crear App Service desde Azure Portal**
- Plan: Basic B1, Linux, .NET 8 runtime
- Habilitar AlwaysOn = true
- Habilitar WebSockets
- Anotar el publish profile (Get Publish Profile → descargar XML)

- [ ] **Step 2: Configurar App Settings (env vars) en el portal**
- `Twitch__Channel` = tu canal
- `StreamerPanel__User` = elige uno
- `StreamerPanel__Pass` = genera password fuerte
- `Database__Path` = `/home/data/game.db`

- [ ] **Step 3: Anotar URL pública** (algo como `streamer-tinder.azurewebsites.net`)

---

### Task 40: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`
- Add GitHub Secret: `AZURE_PUBLISH_PROFILE` (pega el contenido del XML del Task 39)

- [ ] **Step 1: Workflow**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET 8
        uses: actions/setup-dotnet@v4
        with: { dotnet-version: '8.0.x' }

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/web/package-lock.json

      - name: Build Angular
        working-directory: apps/web
        run: |
          npm ci
          npm run build

      - name: Publish .NET
        run: dotnet publish apps/api/StreamerTinder.Api.csproj -c Release -o publish

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: streamer-tinder
          publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
          package: ./publish
```

- [ ] **Step 2: Commit + push y verifica que la Action verde llega**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: GitHub Actions workflow to deploy to Azure App Service"
git push origin main
```

Comprueba en GitHub Actions tab que se ejecuta y termina verde. Después abre la URL pública y verifica:
- `https://streamer-tinder.azurewebsites.net/health` → `{"status":"ok"}`
- `https://streamer-tinder.azurewebsites.net/overlay` → renderiza
- `https://streamer-tinder.azurewebsites.net/streamer` → pide Basic auth, con tus creds entra
- `https://streamer-tinder.azurewebsites.net/leaderboard` → tabla vacía

---

### Task 41: Smoke test end-to-end en producción

- [ ] **Step 1: Configura OBS** en tu setup con un Browser Source apuntando a `/overlay`, tamaño 1280×720.
- [ ] **Step 2: Abre el panel del streamer** en segunda pantalla con auth.
- [ ] **Step 3: Crea un canal de prueba** o usa el tuyo en privado y haz que alguien escriba `!join` desde el chat.
- [ ] **Step 4: Juega una partida entera**: abre lobby → 1 viewer entra → empezar (no, mínimo 10 — usa cuentas de prueba o ajusta `LobbyMin` temporalmente a 1 para validar flujo) → 10 cartas → criba → finalizar.
- [ ] **Step 5: Verifica que tu nick aparece en `/leaderboard`** después de la partida.
- [ ] **Step 6: Cerrar TODOs**: commit cualquier ajuste de configuración pendiente.

```bash
git add -A
git commit -m "feat: end-to-end smoke test passed in production"
git push
```

---

## Self-review notes

Recorrer este plan tras escribirlo identifica gaps:

**Cubierto explícitamente del spec:**
- Todas las 7 fases del juego (tasks 22-29, 30-36)
- Auth Basic en `/streamer` (task 7)
- Leaderboard persistente + página pública (tasks 9, 37)
- Twitch IRC anónimo con todos los aliases de comando (tasks 11, 15)
- Modelo de datos completo (task 8)
- Scoring con bonus distribuido (sub-task 12.6)
- Criba sin orden estricto, sin undo, bonus visible (task 28)
- Ban + vaciar lobby (sub-task 12.2, hub task 16)
- Deploy a Azure App Service B1 (tasks 39-40)
- Hard cap 60 (sub-task 12.2)
- Caso límite "streamer no vota en 10s" (sub-task 12.4, test explícito)

**Diferido conscientemente** (sale en sección "Fuera de scope v1" del spec):
- OAuth Twitch (no se construye)
- Bot escribe en chat (no se construye)
- Predicciones nativas (no se construye)
- Subida de packs por streamer (no se construye)
- Sonido (no se construye)
- Tests E2E automáticos (no se construye, sólo manual en task 41)

**Detalles dejados al implementador con guía**:
- Algoritmo exacto de hash → sprite: copia literal del handoff (task 19)
- Tokens CSS: copia literal del handoff (task 17)
- Sprites concretos por pose: portar makePoseBuffer (task 19b)
- Imágenes reales de cartas: placeholders en task 38, reemplazar manualmente
- Nombres definitivos: working name `twitch-tinder` mantenido

**Sin placeholders TBD ni TODO en el plan**: ✓
