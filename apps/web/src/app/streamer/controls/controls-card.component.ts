import { Component, Input, inject, computed, signal } from '@angular/core';
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

      @if (devMode) {
        <div class="dev-panel">
          <label>DEV · AUTO-VOTAR CHAT</label>
          <div class="dev-row">
            <button (click)="autoVote(20)"  [disabled]="busy()">80% sí</button>
            <button (click)="autoVote(50)"  [disabled]="busy()">50/50</button>
            <button (click)="autoVote(80)"  [disabled]="busy()">80% no</button>
          </div>
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
    .dev-panel {
      margin-top: var(--u2); padding: var(--u2);
      border: 2px dashed var(--c-gold); background: rgba(0,0,0,0.3);
      display: flex; flex-direction: column; gap: var(--u);
    }
    .dev-panel label { color: var(--c-gold); font-size: var(--fs-xs); letter-spacing: 1px; }
    .dev-row { display: flex; gap: var(--u); flex-wrap: wrap; }
    .dev-row button {
      font-family: var(--font-title); font-size: var(--fs-xs);
      background: var(--c-dusk); color: var(--c-gold);
      border: 2px solid var(--c-gold); padding: var(--u) var(--u2);
      cursor: pointer;
    }
    .dev-row button:hover:not(:disabled) { background: var(--c-gold); color: var(--c-void); }
    .dev-row button:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class ControlsCardComponent {
  @Input() devMode = false;
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);
  protected readonly hasVoted = computed(() => !!this.store.state()?.streamerVote);
  protected busy = signal(false);
  protected errorMsg = '';

  protected async autoVote(leftBiasPercent: number): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.errorMsg = '';
    try {
      await this.sr.invoke('DevAutoVote', leftBiasPercent);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al auto-votar';
    } finally {
      this.busy.set(false);
    }
  }

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
