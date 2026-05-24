import { Component, inject, computed } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';
import { SignalRService } from '../../core/signalr.service';

@Component({
  selector: 'controls-card',
  standalone: true,
  template: `
    <div class="ctrl-card">
      <h2>{{ store.currentCard()?.id ?? '...' }}</h2>
      @if (store.currentCard()?.subtitle) {
        <p class="subtitle">{{ store.currentCard()!.subtitle }}</p>
      }

      @if (!hasVoted()) {
        <div class="vote-row">
          <button class="btn-no" (click)="vote('left')">← NO · !izq</button>
          <button class="btn-yes" (click)="vote('right')">SÍ · !der →</button>
        </div>
        <p class="hint">Tu voto decide cuántos espectadores aciertan</p>
      } @else {
        <div class="voted-state">
          <p class="voted-label">VOTASTE:
            <strong [class.voted-no]="store.state()?.streamerVote === 'left'"
                    [class.voted-yes]="store.state()?.streamerVote === 'right'">
              {{ store.state()?.streamerVote === 'left' ? '← NO · IZQ' : '→ SÍ · DER' }}
            </strong>
          </p>
          <button class="btn-close" (click)="closeCard()">
            ■ CERRAR CARTA
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .ctrl-card { display: flex; flex-direction: column; gap: var(--u3); }
    h2 { font-size: var(--fs-lg); color: var(--c-paper); }
    .subtitle { font-family: var(--font-body); font-size: var(--fs-body); color: var(--c-ash); }
    .vote-row { display: flex; gap: var(--u3); }
    .btn-no, .btn-yes {
      flex: 1; font-family: var(--font-title); font-size: var(--fs-lg);
      padding: var(--u3) var(--u4);
      border: 6px solid; cursor: pointer;
      box-shadow: var(--shadow-pixel-lg);
    }
    .btn-no {
      background: var(--c-void); color: var(--c-danger);
      border-color: var(--c-danger);
    }
    .btn-no:hover { background: var(--c-danger); color: var(--c-void); }
    .btn-yes {
      background: var(--c-void); color: var(--c-success);
      border-color: var(--c-success);
    }
    .btn-yes:hover { background: var(--c-success); color: var(--c-void); }
    .hint { font-family: var(--font-body); font-size: var(--fs-body-sm); color: var(--c-ash); }
    .voted-state { display: flex; flex-direction: column; gap: var(--u2); }
    .voted-label { font-size: var(--fs-md); color: var(--c-bone); }
    .voted-no { color: var(--c-danger); }
    .voted-yes { color: var(--c-success); }
    .btn-close {
      font-family: var(--font-title); font-size: var(--fs-md);
      background: var(--c-gold); color: var(--c-void);
      border: none; padding: var(--u2) var(--u4);
      cursor: pointer; box-shadow: var(--shadow-pixel);
      width: fit-content;
    }
    .btn-close:hover { background: var(--c-paper); }
  `]
})
export class ControlsCardComponent {
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);
  protected readonly hasVoted = computed(() => !!this.store.state()?.streamerVote);

  protected async vote(dir: 'left' | 'right'): Promise<void> {
    try {
      await this.sr.invoke('StreamerVote', dir);
    } catch (e) {
      console.error('StreamerVote failed:', e);
    }
  }

  protected async closeCard(): Promise<void> {
    try {
      await this.sr.invoke('CloseCard');
    } catch (e) {
      console.error('CloseCard failed:', e);
    }
  }
}
