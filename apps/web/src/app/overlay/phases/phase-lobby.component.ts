import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';
import { ExtendingTimer, TimerBadge } from '../../core/extending-timer';
import { SpriteComponent } from '../../ui/sprite/sprite.component';

@Component({
  selector: 'phase-lobby',
  standalone: true,
  imports: [SpriteComponent],
  template: `
    <div class="phase-lobby">
      <div class="lobby-title">
        <h2>LOBBY ABIERTO · <span class="count">{{ players().length }}</span> <span class="cap">/ 60</span></h2>
        <p>Escribe <span class="cmd">!join</span> en el chat para entrar · <span class="nocmd">!leave</span> para salir</p>
      </div>
      <div class="lobby-grid">
        @for (p of players(); track p.nick) {
          <div class="av">
            <app-sprite [nick]="p.nick" [scale]="2" />
          </div>
        }
      </div>
      <div class="countdown" [class.ready]="players().length >= 10">
        EMPIEZA EN <span class="num">{{ countdownDisplay() }}</span>
        @for (b of countdownBadges(); track b.id) {
          <span class="extend-badge">+{{ b.secs }}s</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .phase-lobby { width: 100%; height: 100%; position: relative; }
    .lobby-title {
      position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
      text-align: center; width: 100%;
    }
    .lobby-title h2 {
      font-family: var(--font-title); font-size: 24px; color: var(--c-paper);
      margin-bottom: var(--u-half);
    }
    .count { color: var(--c-flame); }
    .cap { color: var(--c-ash); font-size: 16px; }
    .lobby-title p { font-family: var(--font-body); font-size: 24px; color: var(--c-bone); }
    .cmd { color: var(--c-flame); }
    .nocmd { color: var(--c-ice); }
    .lobby-grid {
      position: absolute; top: 120px; left: 40px; right: 40px; bottom: 110px;
      display: grid;
      grid-template-columns: repeat(15, 1fr);
      gap: 6px;
      align-content: end;
    }
    .av { display: flex; flex-direction: column; align-items: center; }
    .countdown {
      position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
      font-family: var(--font-title); font-size: 22px;
      color: var(--c-gold); text-align: center;
      padding: var(--u) var(--u3);
      background: var(--c-void);
      border: 4px solid var(--c-gold);
      white-space: nowrap;
    }
    .countdown .num { font-size: 28px; animation: pixel-blink 1s step-end infinite; }
    .countdown.ready { color: var(--c-success); border-color: var(--c-success); }
    .extend-badge {
      position: absolute;
      left: 50%; top: -6px;
      transform: translateX(-50%) translateY(-100%);
      font-family: var(--font-title); font-size: 14px;
      color: var(--c-void); background: var(--c-gold);
      border: 3px solid var(--c-void);
      padding: 4px 10px;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 3px 3px 0 var(--c-void);
      animation: extend-pop 1.3s steps(10) forwards;
      z-index: 20;
    }
    @keyframes extend-pop {
      0%   { transform: translateX(-50%) translateY(0) scale(0);     opacity: 0; }
      15%  { transform: translateX(-50%) translateY(-40%) scale(1.5); opacity: 1; }
      30%  { transform: translateX(-50%) translateY(-70%) scale(0.9); }
      45%  { transform: translateX(-50%) translateY(-85%) scale(1.1); }
      60%  { transform: translateX(-50%) translateY(-100%) scale(1);  }
      85%  { transform: translateX(-50%) translateY(-100%) scale(1); opacity: 1; }
      100% { transform: translateX(-50%) translateY(-220%) scale(0.7); opacity: 0; }
    }
  `]
})
export class PhaseLobbyComponent implements OnInit, OnDestroy {
  protected store = inject(GameStateStore);
  protected readonly players = this.store.lobbyPlayers;
  protected readonly countdownDisplay = signal('--:--');
  protected readonly countdownBadges = signal<TimerBadge[]>([]);
  private _interval: ReturnType<typeof setInterval> | null = null;
  // Lobby has no per-round reset — once the streamer opens the lobby the
  // single countdown can keep extending until they hit "INICIAR PARTIDA".
  private _timer = new ExtendingTimer({ extendBy: 5 });

  ngOnInit(): void {
    this._tick();
    this._interval = setInterval(() => this._tick(), 250);
  }
  ngOnDestroy(): void {
    if (this._interval) clearInterval(this._interval);
  }
  private _tick(): void {
    const r = this._timer.tick(this.store.state()?.lobbyCountdownEndsAt);
    this.countdownDisplay.set(r.display);
    this.countdownBadges.set(r.badges);
  }
}
