import { Component, inject, computed } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';
import { SpriteComponent } from '../../ui/sprite/sprite.component';

@Component({
  selector: 'phase-tally',
  standalone: true,
  imports: [SpriteComponent],
  template: `
    <div class="phase-tally">
      <div class="tally-head">
        <h2 class="blink">¡RECUENTO!</h2>
        <p>Los avatares vuelan a su tier según aciertos en las 10 cartas</p>
      </div>
      <div class="columns">
        @for (col of columns(); track col.tier) {
          <div class="col" [class.high-tier]="col.tier >= 8">
            <div class="tier">{{ col.tier }}<span class="label">acierto{{ col.tier === 1 ? '' : 's' }}</span></div>
            <div class="count">{{ col.nicks.length }} viewers</div>
            <div class="bodies">
              @for (nick of col.nicks; track nick; let i = $index) {
                <div class="sprite-wrap migrating" [style.animation-delay]="(col.tier * 0.06 + i * 0.03) + 's'">
                  <app-sprite [nick]="nick" [scale]="1" state="voted" />
                </div>
              }
            </div>
          </div>
        }
      </div>
      <div class="bonus-bar">
        <div class="lbl">SUPERVIVIENTES PROVISIONALES</div>
        <div class="nums"><strong>{{ totalPlayers() }}</strong> · bote 100 pts</div>
        <div class="bonus-val">+{{ bonusPerPlayer() }} PT<small>{{ totalPlayers() > 1 ? 'S' : '' }} cada uno · sin criba</small></div>
      </div>
    </div>
  `,
  styles: [`
    .phase-tally { width: 100%; height: 100%; position: relative; }
    .tally-head {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
      text-align: center; z-index: 5; white-space: nowrap;
    }
    .tally-head h2 { font-family: var(--font-title); font-size: 18px; color: var(--c-flame); text-shadow: 3px 3px 0 var(--c-void); }
    .tally-head p { font-family: var(--font-body); font-size: 20px; color: var(--c-bone); margin-top: 4px; }
    .columns {
      position: absolute; top: 64px; left: 40px; right: 40px; bottom: 80px;
      display: grid; grid-template-columns: repeat(11, 1fr); gap: 6px;
    }
    .col {
      background: var(--c-dusk); border: 2px solid var(--c-stone);
      padding: 4px; display: flex; flex-direction: column; position: relative;
    }
    .col.high-tier { border-color: var(--c-gold); }
    .col.high-tier .tier { color: var(--c-gold); }
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
    .migrating { animation: migrate-in 0.4s steps(4) both; }
    @keyframes migrate-in {
      0%   { transform: translateY(-300px) scale(1.2); opacity: 0; }
      50%  { transform: translateY(-100px) scale(1.1); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
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
export class PhaseTallyComponent {
  protected store = inject(GameStateStore);
  protected readonly columns = computed(() => {
    const abn = this.store.aciertosByNick();
    return Array.from({ length: 11 }, (_, tier) => ({
      tier,
      nicks: Object.entries(abn).filter(([, a]) => a === tier).map(([nick]) => nick)
    }));
  });
  protected readonly totalPlayers = computed(() =>
    Object.keys(this.store.aciertosByNick()).length
  );
  protected readonly bonusPerPlayer = computed(() =>
    Math.floor(100 / Math.max(1, this.totalPlayers()))
  );
}
