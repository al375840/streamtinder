import { Component, inject, computed } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';
import { SpriteComponent } from '../../ui/sprite/sprite.component';

@Component({
  selector: 'phase-criba',
  standalone: true,
  imports: [SpriteComponent],
  template: `
    <div class="phase-criba">
      <div class="tally-head">
        <h2 class="blink" style="color:var(--c-danger)">¡CRIBA!</h2>
        <p>El streamer está eliminando tiers a dedo</p>
      </div>
      <div class="columns">
        @for (col of columns(); track col.tier) {
          <div class="col" [class.high-tier]="col.tier >= 8" [class.eliminated]="col.eliminated">
            <div class="tier">{{ col.tier }}<span class="label">acierto{{ col.tier === 1 ? '' : 's' }}</span></div>
            <div class="count">{{ col.nicks.length }} viewers</div>
            <div class="bodies">
              @for (nick of col.nicks; track nick; let i = $index) {
                <div class="sprite-wrap" [style.animation-delay]="(i * 0.05) + 's'">
                  <app-sprite [nick]="nick" [scale]="1" [state]="col.eliminated ? 'eliminated' : 'voted'" />
                </div>
              }
            </div>
          </div>
        }
      </div>
      <div class="bonus-bar">
        <div class="lbl">SUPERVIVIENTES ACTUALES</div>
        <div class="nums"><strong>{{ survivorCount() }}</strong> · bote 100 pts</div>
        <div class="bonus-val">+{{ bonusPerSurvivor() }} PTS<small>por superviviente · floor(100/{{ survivorCount() }})</small></div>
      </div>
    </div>
  `,
  styles: [`
    .phase-criba { width: 100%; height: 100%; position: relative; }
    .tally-head {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
      text-align: center; z-index: 5; white-space: nowrap;
    }
    .tally-head h2 { font-family: var(--font-title); font-size: 18px; text-shadow: 3px 3px 0 var(--c-void); }
    .tally-head p { font-family: var(--font-body); font-size: 20px; color: var(--c-bone); margin-top: 4px; }
    .columns {
      position: absolute; top: 64px; left: 40px; right: 40px; bottom: 80px;
      display: grid; grid-template-columns: repeat(11, 1fr); gap: 6px;
    }
    .col {
      background: var(--c-dusk); border: 2px solid var(--c-stone);
      padding: 4px; display: flex; flex-direction: column; position: relative;
      cursor: pointer;
    }
    .col:hover { border-color: var(--c-flame); }
    .col.high-tier { border-color: var(--c-gold); }
    .col.high-tier .tier { color: var(--c-gold); }
    .col.eliminated { border-color: var(--c-danger); background: var(--c-night); }
    .col.eliminated .tier { color: var(--c-danger); }
    .col.eliminated::after {
      content: '×'; position: absolute; top: 40%; left: 50%;
      transform: translate(-50%, -50%);
      font-family: var(--font-title); font-size: 64px;
      color: var(--c-danger); text-shadow: 4px 4px 0 var(--c-void);
      pointer-events: none; z-index: 10;
    }
    .tier {
      font-family: var(--font-title); font-size: 18px;
      color: var(--c-paper); text-align: center;
      padding: var(--u-half); background: var(--c-void);
      border-bottom: 2px solid var(--c-stone);
    }
    .label { display: block; font-size: 6px; color: var(--c-ash); letter-spacing: 1px; margin-top: 2px; }
    .count {
      font-family: var(--font-title); font-size: 12px;
      color: var(--c-gold); text-align: center;
      padding: 2px; background: var(--c-void);
      border-bottom: 2px dashed var(--c-stone);
    }
    .bodies {
      flex: 1; display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 2px; align-content: end; padding: 2px; overflow: hidden;
    }
    .sprite-wrap { display: flex; align-items: center; justify-content: center; }
    :host ::ng-deep .col.eliminated canvas {
      animation: column-fall 1.6s steps(8) forwards;
      animation-delay: inherit;
    }
    .bonus-bar {
      position: absolute; left: 40px; right: 40px; bottom: 16px;
      background: var(--c-void); border: 4px solid var(--c-paper);
      padding: var(--u) var(--u2);
      display: grid; grid-template-columns: auto 1fr auto; gap: var(--u3);
      align-items: center; z-index: 5;
    }
    .lbl { font-family: var(--font-title); font-size: 12px; color: var(--c-ash); }
    .nums { font-family: var(--font-title); font-size: 16px; color: var(--c-paper); display: flex; gap: var(--u3); }
    .nums strong { color: var(--c-success); }
    .bonus-val { font-family: var(--font-title); font-size: 22px; color: var(--c-gold); text-shadow: 3px 3px 0 var(--c-void); text-align: right; }
    .bonus-val small { display: block; font-size: 10px; color: var(--c-ash); margin-top: 2px; }
  `]
})
export class PhaseCribaComponent {
  protected store = inject(GameStateStore);
  protected readonly eliminated = this.store.eliminatedTiers;
  protected readonly columns = computed(() => {
    const abn = this.store.aciertosByNick();
    const elim = this.eliminated();
    return Array.from({ length: 11 }, (_, tier) => ({
      tier,
      eliminated: elim.includes(tier),
      nicks: Object.entries(abn).filter(([, a]) => a === tier).map(([nick]) => nick)
    }));
  });
  protected readonly survivorCount = computed(() => {
    const elim = this.eliminated();
    const abn = this.store.aciertosByNick();
    return Object.values(abn).filter(a => !elim.includes(a)).length;
  });
  protected readonly bonusPerSurvivor = computed(() =>
    Math.floor(100 / Math.max(1, this.survivorCount()))
  );
}
