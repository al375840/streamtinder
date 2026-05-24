import { Component, inject, computed } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';

@Component({
  selector: 'phase-card-reveal',
  standalone: true,
  template: `
    <div class="phase-reveal">
      <div class="reveal-grid">
        <!-- mini card -->
        <div class="reveal-card-mini">
          <div class="img">
            @if (card()?.imagePath) {
              <img [src]="card()!.imagePath" alt="" />
            } @else {
              <span>[ {{ card()?.id ?? '???' }} ]</span>
            }
          </div>
          <div class="nm">{{ card()?.id ?? '???' }}</div>
        </div>

        <!-- streamer pick -->
        <div class="reveal-pick" [class.left]="streamerVote() === 'left'" [class.right]="streamerVote() === 'right'">
          <div class="alias">EL STREAMER ELIGIÓ</div>
          <div class="stamp pulse">
            @if (streamerVote() === 'left') { ← IZQ · NO }
            @else if (streamerVote() === 'right') { → DER · SÍ }
            @else { PENDIENTE }
          </div>
        </div>

        <!-- aciertos -->
        <div class="reveal-aciertos">
          <div class="lbl">ACERTARON</div>
          <div class="big">{{ matchingVotes() }}</div>
          <div class="sub">de <strong>{{ totalVotes() }}</strong> votos
            @if (totalVotes() > 0) { ({{ pct() }}%) }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .phase-reveal { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .reveal-grid {
      display: grid; grid-template-columns: 1fr auto 1fr;
      align-items: center; gap: var(--u3);
      width: 100%; padding: 0 var(--u3);
    }
    .reveal-card-mini {
      width: 280px; height: 360px; margin-left: auto;
      background: var(--c-paper); color: var(--c-void);
      border: 6px solid var(--c-void);
      padding: var(--u);
      display: flex; flex-direction: column;
      box-shadow: var(--shadow-pixel-lg);
    }
    .img {
      flex: 1;
      background-image: repeating-linear-gradient(45deg, var(--c-night) 0 12px, var(--c-dusk) 12px 24px);
      border: 3px solid var(--c-void);
      display: flex; align-items: center; justify-content: center;
      color: var(--c-bone); font-family: var(--font-title); font-size: 10px;
    }
    .img img { width: 70%; height: 70%; object-fit: contain; }
    .nm { font-family: var(--font-title); font-size: 18px; color: var(--c-void); text-align: center; padding: var(--u); }
    .reveal-pick { display: flex; flex-direction: column; align-items: center; gap: var(--u); text-align: center; }
    .alias { font-family: var(--font-title); font-size: 11px; color: var(--c-paper); }
    .stamp {
      font-family: var(--font-title); font-size: 28px;
      padding: var(--u2) var(--u3);
      border: 6px solid;
      background: var(--c-void);
      transform: rotate(-6deg);
    }
    .reveal-pick.left  .stamp { color: var(--c-danger); border-color: var(--c-danger); }
    .reveal-pick.right .stamp { color: var(--c-success); border-color: var(--c-success); }
    .reveal-aciertos {
      margin-right: auto;
      background: var(--c-dusk);
      border: 4px solid var(--c-success);
      padding: var(--u2) var(--u3);
      text-align: center;
    }
    .lbl { font-family: var(--font-title); font-size: 10px; color: var(--c-ash); margin-bottom: var(--u); }
    .big { font-family: var(--font-title); font-size: 64px; color: var(--c-success); text-shadow: 4px 4px 0 var(--c-void); }
    .sub { font-family: var(--font-body); font-size: 22px; color: var(--c-bone); margin-top: var(--u); }
    .sub strong { color: var(--c-flame); }
  `]
})
export class PhaseCardRevealComponent {
  protected store = inject(GameStateStore);
  protected readonly card = this.store.currentCard;
  protected readonly streamerVote = computed(() => this.store.state()?.streamerVote ?? null);
  protected readonly matchingVotes = computed(() => {
    const votes = this.store.state()?.currentCardVotes ?? {};
    const sv = this.store.state()?.streamerVote;
    if (!sv) return 0;
    return Object.values(votes).filter(v => v.direction === sv).length;
  });
  protected readonly totalVotes = computed(() =>
    Object.keys(this.store.state()?.currentCardVotes ?? {}).length
  );
  protected readonly pct = computed(() => {
    const t = this.totalVotes();
    return t === 0 ? 0 : Math.round(this.matchingVotes() / t * 100);
  });
}
