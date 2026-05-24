import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';
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
  `]
})
export class PhaseLobbyComponent implements OnInit, OnDestroy {
  protected store = inject(GameStateStore);
  protected readonly players = this.store.lobbyPlayers;
  protected readonly countdownDisplay = signal('--:--');
  private _interval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this._tick();
    this._interval = setInterval(() => this._tick(), 1000);
  }
  ngOnDestroy(): void {
    if (this._interval) clearInterval(this._interval);
  }
  private _tick(): void {
    const endsAt = this.store.state()?.lobbyCountdownEndsAt;
    if (!endsAt) { this.countdownDisplay.set('--:--'); return; }
    const secs = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    this.countdownDisplay.set(`${m}:${String(s).padStart(2, '0')}`);
  }
}
