import { Component, Input, inject, computed, signal, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameStateStore, PackDto } from '../../core/game-state.store';
import { SignalRService } from '../../core/signalr.service';

@Component({
  selector: 'controls-victory',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ctrl-victory">
      <h2>¡PARTIDA TERMINADA!</h2>

      <div class="winners-summary">
        <p>{{ store.winners().length }} ganadores</p>
        @for (w of store.winners().slice(0, 5); track w.nick) {
          <div class="winner-row">
            <span class="rk">{{ $index + 1 }}.</span>
            <span class="wn">{{'@'}}{{ w.nick }}</span>
            <span class="wp">+{{ w.totalPoints }} pts</span>
          </div>
        }
      </div>

      <div class="new-round">
        <h3>NUEVA PARTIDA</h3>
        <div class="round-btns">
          <button class="btn-same" (click)="samePackNewRound()"
                  [disabled]="!currentPackId() || busy()">
            ↺ MISMO PACK
          </button>
          <div class="other-pack">
            <select [(ngModel)]="selectedPackId">
              @for (p of packs; track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
            <button class="btn-other" (click)="otherPackNewRound()" [disabled]="busy()">▶ OTRO PACK</button>
          </div>
        </div>
      </div>

      @if (errorMsg) { <p class="error-msg">{{ errorMsg }}</p> }
    </div>
  `,
  styles: [`
    .ctrl-victory { display: flex; flex-direction: column; gap: var(--u3); }
    h2 { font-size: var(--fs-lg); color: var(--c-gold); }
    h3 { font-size: var(--fs-sm); color: var(--c-ash); letter-spacing: 1px; margin-bottom: var(--u); }
    .winners-summary { background: var(--c-dusk); border: 2px solid var(--c-stone); padding: var(--u2); }
    .winners-summary p { font-family: var(--font-body); font-size: var(--fs-body); color: var(--c-bone); margin-bottom: var(--u); }
    .winner-row { display: flex; gap: var(--u2); font-family: var(--font-title); font-size: var(--fs-xs); color: var(--c-bone); padding: 4px 0; border-bottom: 1px dashed var(--c-stone); }
    .rk { color: var(--c-ash); }
    .wn { flex: 1; color: var(--c-paper); }
    .wp { color: var(--c-gold); }
    .round-btns { display: flex; gap: var(--u2); align-items: center; flex-wrap: wrap; }
    .btn-same {
      font-family: var(--font-title); font-size: var(--fs-sm);
      background: var(--c-ice); color: var(--c-void);
      border: none; padding: var(--u2) var(--u3);
      cursor: pointer; box-shadow: var(--shadow-pixel);
    }
    .btn-same:hover:not(:disabled) { background: var(--c-paper); }
    .btn-same:disabled { opacity: 0.4; cursor: not-allowed; }
    .other-pack { display: flex; gap: var(--u); }
    select {
      font-family: var(--font-title); font-size: var(--fs-xs);
      background: var(--c-dusk); color: var(--c-bone);
      border: 2px solid var(--c-stone); padding: var(--u) var(--u2);
    }
    .btn-other {
      font-family: var(--font-title); font-size: var(--fs-sm);
      background: var(--c-flame); color: var(--c-void);
      border: none; padding: var(--u2) var(--u2);
      cursor: pointer; box-shadow: var(--shadow-pixel);
    }
    .btn-other:hover:not(:disabled) { background: var(--c-paper); }
    .btn-other:disabled { opacity: 0.4; cursor: not-allowed; }
    .error-msg { color: var(--c-danger); font-size: var(--fs-xs); margin-top: var(--u); }
  `]
})
export class ControlsVictoryComponent implements OnChanges {
  @Input() packs: PackDto[] = [];
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);
  protected selectedPackId = '';
  protected readonly currentPackId = computed(() => this.store.state()?.pack?.id ?? '');
  protected busy = signal(false);
  protected errorMsg = '';

  ngOnChanges(): void {
    if (this.packs.length > 0 && !this.selectedPackId) {
      this.selectedPackId = this.packs[0].id;
    }
  }

  protected async samePackNewRound(): Promise<void> {
    const packId = this.currentPackId();
    if (!packId || this.busy()) return;
    this.busy.set(true);
    this.errorMsg = '';
    try {
      const nick = this.store.streamerNick();
      await this.sr.invoke('OpenLobby', packId, nick);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al abrir nueva partida';
    } finally {
      this.busy.set(false);
    }
  }

  protected async otherPackNewRound(): Promise<void> {
    if (!this.selectedPackId || this.busy()) return;
    this.busy.set(true);
    this.errorMsg = '';
    try {
      const nick = this.store.streamerNick();
      await this.sr.invoke('OpenLobby', this.selectedPackId, nick);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al abrir nueva partida';
    } finally {
      this.busy.set(false);
    }
  }
}
