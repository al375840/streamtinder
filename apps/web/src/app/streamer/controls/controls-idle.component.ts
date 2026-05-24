import { Component, Input, inject, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameStateStore, PackDto } from '../../core/game-state.store';
import { SignalRService } from '../../core/signalr.service';

@Component({
  selector: 'controls-idle',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ctrl-idle">
      <h2>ABRIR LOBBY</h2>

      <div class="form-row">
        <label>PACK</label>
        <select [(ngModel)]="selectedPackId">
          @for (p of packs; track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
      </div>

      <div class="form-row">
        <label>TU NICK DE TWITCH</label>
        <input type="text" [(ngModel)]="streamerNick" placeholder="tu_nick" maxlength="25" />
      </div>

      <button class="btn-primary" (click)="openLobby()" [disabled]="!canOpen()">
        ▶ ABRIR LOBBY
      </button>

      @if (errorMsg) {
        <p class="error">{{ errorMsg }}</p>
      }
    </div>
  `,
  styles: [`
    .ctrl-idle { display: flex; flex-direction: column; gap: var(--u3); }
    h2 { font-size: var(--fs-lg); color: var(--c-paper); margin-bottom: var(--u); }
    .form-row { display: flex; flex-direction: column; gap: var(--u-half); }
    label { font-size: var(--fs-xs); color: var(--c-ash); letter-spacing: 1px; }
    select, input {
      font-family: var(--font-title); font-size: var(--fs-sm);
      background: var(--c-dusk); color: var(--c-bone);
      border: 2px solid var(--c-stone);
      padding: var(--u) var(--u2);
      width: 100%; max-width: 400px;
    }
    select:focus, input:focus {
      outline: none; border-color: var(--c-flame);
    }
    .btn-primary {
      font-family: var(--font-title); font-size: var(--fs-sm);
      background: var(--c-flame); color: var(--c-void);
      border: none; padding: var(--u2) var(--u4);
      cursor: pointer; box-shadow: var(--shadow-pixel);
      letter-spacing: 1px; width: fit-content;
    }
    .btn-primary:hover:not(:disabled) { background: var(--c-paper); }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .error { color: var(--c-danger); font-size: var(--fs-xs); margin-top: var(--u); }
  `]
})
export class ControlsIdleComponent implements OnChanges {
  @Input() packs: PackDto[] = [];
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);
  protected selectedPackId = '';
  protected streamerNick = '';
  protected errorMsg = '';

  ngOnChanges(): void {
    if (this.packs.length > 0 && !this.selectedPackId) {
      this.selectedPackId = this.packs[0].id;
    }
  }

  protected canOpen(): boolean {
    return !!this.selectedPackId && this.streamerNick.trim().length >= 2;
  }

  protected async openLobby(): Promise<void> {
    if (!this.canOpen()) return;
    this.errorMsg = '';
    try {
      await this.sr.invoke('OpenLobby', this.selectedPackId, this.streamerNick.trim());
      this.store.streamerNick.set(this.streamerNick.trim());
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al abrir lobby';
    }
  }
}
