import { Component, inject, computed } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';
import { SpriteComponent } from '../../ui/sprite/sprite.component';

interface VictoryRow { nick: string; aciertos: number; totalPoints: number; rank: number; }
interface ConfettiPiece { left: string; bg: string; delay: string; duration: string; }

@Component({
  selector: 'phase-victory',
  standalone: true,
  imports: [SpriteComponent],
  template: `
    <div class="phase-victory">
      <div class="victory-title pulse">¡{{ rows().length }} GANADORES!</div>
      <div class="victory-sub">Han sobrevivido a la criba <strong>{{ rows().length }}</strong> espectadores</div>
      <div class="game-board">
        <div class="gb-row head">
          <span class="rk">#</span>
          <span class="av"></span>
          <span class="nick">NICK</span>
          <span class="acs">ACIERTOS</span>
          <span class="pts">PTS</span>
        </div>
        @for (r of displayRows(); track r.nick) {
          <div class="gb-row" [class.gold]="r.rank === 1">
            <span class="rk">{{ r.rank }}</span>
            <span class="av"><app-sprite [nick]="r.nick" [scale]="1" [state]="r.rank === 1 ? 'winner' : 'voted'" /></span>
            <span class="nick">&#64;{{ r.nick }}</span>
            <span class="acs">{{ r.aciertos }}/10</span>
            <span class="pts">+{{ r.totalPoints }}</span>
          </div>
        }
        @if (rows().length > 9) {
          <div class="gb-row more">
            <span class="rk">+</span><span class="av"></span>
            <span class="nick">…y {{ rows().length - 9 }} más</span>
            <span class="acs"></span><span class="pts"></span>
          </div>
        }
      </div>
      <div class="confetti">
        @for (c of confetti; track $index) {
          <i [style.left]="c.left" [style.background]="c.bg"
             [style.animation-delay]="c.delay" [style.animation-duration]="c.duration"></i>
        }
      </div>
    </div>
  `,
  styles: [`
    .phase-victory {
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: flex-start;
      padding: var(--u2) var(--u3); gap: var(--u);
      position: relative;
    }
    .victory-title {
      font-family: var(--font-title); font-size: 44px;
      color: var(--c-gold); text-shadow: 5px 5px 0 var(--c-flame-dk);
      letter-spacing: 4px; margin-top: var(--u);
    }
    .victory-sub { font-family: var(--font-body); font-size: 24px; color: var(--c-bone); }
    .victory-sub strong { color: var(--c-success); font-family: var(--font-title); font-size: 18px; }
    .game-board {
      width: 100%; max-width: 980px;
      background: var(--c-dusk); border: 4px solid var(--c-paper);
      box-shadow: var(--shadow-pixel-lg);
      display: grid; grid-template-columns: 60px 60px 1fr 80px 80px;
      overflow: hidden; z-index: 2;
    }
    .gb-row { display: contents; }
    .gb-row > * {
      padding: 6px 8px;
      border-bottom: 1px dashed var(--c-stone);
      font-family: var(--font-body); font-size: 18px;
      display: flex; align-items: center;
    }
    .gb-row.head > * {
      background: var(--c-night);
      font-family: var(--font-title); font-size: 8px;
      color: var(--c-ash); letter-spacing: 1px;
      border-bottom: 4px solid var(--c-flame);
    }
    .rk { justify-content: center; font-family: var(--font-title); font-size: 12px; color: var(--c-paper); }
    .av { justify-content: center; }
    .nick { color: var(--c-paper); font-family: var(--font-title); font-size: 11px; }
    .acs { justify-content: flex-end; color: var(--c-success); font-family: var(--font-title); font-size: 12px; }
    .pts { justify-content: flex-end; color: var(--c-gold); font-family: var(--font-title); font-size: 12px; }
    .gb-row.gold .rk, .gb-row.gold .nick { color: var(--c-gold); }
    .confetti {
      position: absolute; inset: 0; pointer-events: none; overflow: hidden;
    }
    .confetti i {
      position: absolute; width: 8px; height: 8px; top: -16px;
      animation: confetti-fall 2s steps(20) infinite linear;
    }
  `]
})
export class PhaseVictoryComponent {
  protected store = inject(GameStateStore);

  protected readonly rows = computed((): VictoryRow[] => {
    // Use winners from store if available (server-computed)
    const winners = this.store.winners();
    if (winners.length > 0) {
      return [...winners]
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((w, i) => ({ nick: w.nick, aciertos: w.aciertos, totalPoints: w.totalPoints, rank: i + 1 }));
    }
    // Fallback: compute from aciertosByNick + eliminatedTiers
    const abn = this.store.aciertosByNick();
    const elim = this.store.eliminatedTiers();
    const survivors = Object.values(abn).filter(a => !elim.includes(a));
    const bonus = Math.floor(100 / Math.max(1, survivors.length));
    return Object.entries(abn)
      .filter(([, a]) => !elim.includes(a))
      .map(([nick, aciertos]) => ({ nick, aciertos, totalPoints: aciertos * 10 + bonus, rank: 0 }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  });

  protected readonly displayRows = computed(() => this.rows().slice(0, 9));

  // Confetti generated once at construction — deterministic so no SSR mismatch
  protected readonly confetti: ConfettiPiece[] = (() => {
    const colors = ['#ff3c8b', '#4ad4d4', '#5fde6f', '#ffd33d', '#c97aff', '#ff8a3d'];
    let s = 12345;
    const rng = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 0xFFFFFFFF; };
    return Array.from({ length: 80 }, (_, i) => ({
      left: Math.floor(rng() * 100) + '%',
      bg: colors[i % colors.length],
      delay: (rng() * 2).toFixed(2) + 's',
      duration: (1.5 + rng() * 1.5).toFixed(2) + 's',
    }));
  })();
}
