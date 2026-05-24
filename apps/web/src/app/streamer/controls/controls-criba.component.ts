import { Component, inject, computed, signal } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';
import { SignalRService } from '../../core/signalr.service';

@Component({
  selector: 'controls-criba',
  standalone: true,
  template: `
    <div class="ctrl-criba">
      @if (store.phase() === 'tallyTransition') {
        <h2>TRANSICIÓN...</h2>
        <p class="info">Los avatares se están colocando en sus tiers. La criba comenzará automáticamente.</p>
      } @else {
        <h2>CRIBA · {{ survivorCount() }} supervivientes · +{{ bonus() }} pts cada uno</h2>

        <div class="tier-grid">
          @for (tier of tiers; track tier) {
            <button class="tier-btn"
                    [class.eliminated]="isEliminated(tier)"
                    (click)="toggleTier(tier)"
                    [disabled]="togglingTier() !== null">
              <span class="tn">{{ tier }}</span>
              <span class="ts">{{ tierSize(tier) }} viewers</span>
              @if (isEliminated(tier)) { <span class="ex">×</span> }
            </button>
          }
        </div>

        @if (errorMsg) { <p class="error-msg">{{ errorMsg }}</p> }

        <button class="btn-finalize" (click)="finalizeCriba()"
                [disabled]="survivorCount() === 0 || busy()">
          ✓ FINALIZAR CRIBA
        </button>
      }
    </div>
  `,
  styles: [`
    .ctrl-criba { display: flex; flex-direction: column; gap: var(--u3); }
    h2 { font-size: var(--fs-md); color: var(--c-paper); }
    .info { font-family: var(--font-body); font-size: var(--fs-body); color: var(--c-bone); }
    .tier-grid {
      display: grid; grid-template-columns: repeat(11, 1fr);
      gap: var(--u-half);
    }
    .tier-btn {
      font-family: var(--font-title); font-size: 10px;
      background: var(--c-dusk); color: var(--c-bone);
      border: 2px solid var(--c-stone);
      padding: var(--u) 4px;
      cursor: pointer; position: relative;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      box-shadow: var(--shadow-pixel);
    }
    .tier-btn:hover:not(:disabled) { border-color: var(--c-flame); }
    .tier-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .tier-btn.eliminated { background: var(--c-night); border-color: var(--c-danger); color: var(--c-danger); }
    .tn { font-size: 20px; color: inherit; }
    .ts { font-size: 8px; color: var(--c-ash); }
    .eliminated .ts { color: var(--c-danger-dk); }
    .ex {
      position: absolute; top: 2px; right: 4px;
      font-size: 14px; color: var(--c-danger);
    }
    .error-msg { color: var(--c-danger); font-size: var(--fs-xs); margin-top: var(--u); }
    .btn-finalize {
      font-family: var(--font-title); font-size: var(--fs-md);
      background: var(--c-success); color: var(--c-void);
      border: none; padding: var(--u2) var(--u4);
      cursor: pointer; box-shadow: var(--shadow-pixel);
      width: fit-content;
    }
    .btn-finalize:hover:not(:disabled) { background: var(--c-paper); }
    .btn-finalize:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class ControlsCribaComponent {
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);
  readonly tiers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected togglingTier = signal<number | null>(null);
  protected busy = signal(false);
  protected errorMsg = '';

  protected isEliminated(tier: number): boolean {
    return this.store.eliminatedTiers().includes(tier);
  }

  protected tierSize(tier: number): number {
    const abn = this.store.aciertosByNick();
    return Object.values(abn).filter(a => a === tier).length;
  }

  protected readonly survivorCount = computed(() => {
    const elim = this.store.eliminatedTiers();
    const abn = this.store.aciertosByNick();
    return Object.values(abn).filter(a => !elim.includes(a)).length;
  });

  protected readonly bonus = computed(() =>
    Math.floor(100 / Math.max(1, this.survivorCount()))
  );

  protected async toggleTier(tier: number): Promise<void> {
    if (this.togglingTier() !== null) return;
    this.togglingTier.set(tier);
    this.errorMsg = '';
    try {
      await this.sr.invoke('EliminateTier', tier);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al cambiar tier';
    } finally {
      this.togglingTier.set(null);
    }
  }

  protected async finalizeCriba(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.errorMsg = '';
    try {
      await this.sr.invoke('FinalizeCriba');
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al finalizar la criba';
    } finally {
      this.busy.set(false);
    }
  }
}
