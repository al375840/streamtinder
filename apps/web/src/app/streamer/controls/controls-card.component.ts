import { Component, inject, computed, signal } from '@angular/core';
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
          <button class="btn-no" (click)="vote('left')" [disabled]="busy()">← NO · !izq</button>
          <button class="btn-yes" (click)="vote('right')" [disabled]="busy()">SÍ · !der →</button>
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
          <button class="btn-close" (click)="closeCard()" [disabled]="busy()">
            ■ CERRAR CARTA
          </button>
        </div>
      }

      @if (errorMsg) { <p class="error-msg">{{ errorMsg }}</p> }
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
    .btn-no:disabled, .btn-yes:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-no {
      background: var(--c-void); color: var(--c-danger);
      border-color: var(--c-danger);
    }
    .btn-no:hover:not(:disabled) { background: var(--c-danger); color: var(--c-void); }
    .btn-yes {
      background: var(--c-void); color: var(--c-success);
      border-color: var(--c-success);
    }
    .btn-yes:hover:not(:disabled) { background: var(--c-success); color: var(--c-void); }
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
    .btn-close:hover:not(:disabled) { background: var(--c-paper); }
    .btn-close:disabled { opacity: 0.4; cursor: not-allowed; }
    .error-msg { color: var(--c-danger); font-size: var(--fs-xs); margin-top: var(--u); }
  `]
})
export class ControlsCardComponent {
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);
  protected readonly hasVoted = computed(() => !!this.store.state()?.streamerVote);
  protected busy = signal(false);
  protected errorMsg = '';

  protected async vote(dir: 'left' | 'right'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.errorMsg = '';
    try {
      await this.sr.invoke('StreamerVote', dir);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al votar';
    } finally {
      this.busy.set(false);
    }
  }

  protected async closeCard(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.errorMsg = '';
    try {
      await this.sr.invoke('CloseCard');
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al cerrar la carta';
    } finally {
      this.busy.set(false);
    }
  }
}
