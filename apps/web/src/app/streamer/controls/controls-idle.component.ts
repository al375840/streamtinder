import { Component, Input, inject, OnChanges, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameStateStore, PackDto } from '../../core/game-state.store';
import { SignalRService } from '../../core/signalr.service';

const DEFAULT_PACK = 'nintendo-clasicos';

@Component({
  selector: 'controls-idle',
  standalone: true,
  imports: [],
  template: `
    <div class="ctrl-idle">
      <h2>ABRIR LOBBY</h2>
      <p class="hint">Puedes cambiar el pack una vez el lobby esté abierto.</p>

      <button class="btn-primary" (click)="openLobby()" [disabled]="!defaultPackId || busy">
        ▶ ABRIR LOBBY
      </button>

      @if (errorMsg) {
        <p class="error">{{ errorMsg }}</p>
      }
    </div>
  `,
  styles: [`
    .ctrl-idle { display: flex; flex-direction: column; gap: var(--u3); }
    h2 { font-size: var(--fs-lg); color: var(--c-paper); margin-bottom: 0; }
    .hint { font-family: var(--font-body); font-size: var(--fs-body-sm); color: var(--c-ash); margin: 0; }
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
export class ControlsIdleComponent implements OnInit, OnChanges {
  @Input() packs: PackDto[] = [];
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);
  private route = inject(ActivatedRoute);
  protected defaultPackId = '';
  protected busy = false;
  protected errorMsg = '';

  // Set when ?pack comes from URL → auto-open once packs arrive
  private _urlPack = '';
  private _pendingAutoOpen = false;

  ngOnInit(): void {
    this._urlPack = this.route.snapshot.queryParamMap.get('pack') ?? '';
    if (this._urlPack) this._pendingAutoOpen = true;
  }

  ngOnChanges(): void {
    if (!this.packs.length) return;
    // Priority: URL param > nintendo-clasicos > first pack
    const preferred = this._urlPack || DEFAULT_PACK;
    this.defaultPackId = this.packs.find(p => p.id === preferred)?.id ?? this.packs[0].id;

    if (this._pendingAutoOpen && this.defaultPackId) {
      this._pendingAutoOpen = false;
      this.openLobby();
    }
  }

  protected async openLobby(): Promise<void> {
    if (!this.defaultPackId || this.busy) return;
    this.busy = true;
    this.errorMsg = '';
    try {
      await this.sr.invoke('OpenLobby', this.defaultPackId);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al abrir lobby';
    } finally {
      this.busy = false;
    }
  }
}
