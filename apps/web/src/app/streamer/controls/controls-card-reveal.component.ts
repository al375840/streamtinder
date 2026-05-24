import { Component, inject, computed } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';
import { SignalRService } from '../../core/signalr.service';

@Component({
  selector: 'controls-card-reveal',
  standalone: true,
  template: `
    <div class="ctrl-reveal">
      <h2>CARTA {{ (store.state()?.cardIndex ?? 0) + 1 }} · REVELADA</h2>
      <p class="info">
        Streamer votó: <strong>{{ store.state()?.streamerVote === 'left' ? '← NO' : '→ SÍ' }}</strong>
      </p>
      <button class="btn-next" (click)="nextCard()">
        {{ isLastCard() ? '▶▶ INICIAR CRIBA' : '▶ SIGUIENTE CARTA' }}
      </button>
    </div>
  `,
  styles: [`
    .ctrl-reveal { display: flex; flex-direction: column; gap: var(--u3); }
    h2 { font-size: var(--fs-lg); color: var(--c-paper); }
    .info { font-family: var(--font-body); font-size: var(--fs-body); color: var(--c-bone); }
    .info strong { color: var(--c-flame); }
    .btn-next {
      font-family: var(--font-title); font-size: var(--fs-md);
      background: var(--c-ice); color: var(--c-void);
      border: none; padding: var(--u2) var(--u4);
      cursor: pointer; box-shadow: var(--shadow-pixel);
      width: fit-content;
    }
    .btn-next:hover { background: var(--c-paper); }
  `]
})
export class ControlsCardRevealComponent {
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);

  protected readonly isLastCard = computed(() => {
    const s = this.store.state();
    if (!s?.pack) return false;
    return s.cardIndex >= s.pack.cards.length - 1;
  });

  protected async nextCard(): Promise<void> {
    try {
      await this.sr.invoke('NextCard');
    } catch (e) {
      console.error('NextCard failed:', e);
    }
  }
}
