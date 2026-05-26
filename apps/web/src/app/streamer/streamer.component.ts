import { Component, OnInit, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { SignalRService } from '../core/signalr.service';
import { GameStateStore, GameStateDto, GameWinnerDto, PackDto } from '../core/game-state.store';
import { ControlsIdleComponent } from './controls/controls-idle.component';
import { ControlsLobbyComponent } from './controls/controls-lobby.component';
import { ControlsCardComponent } from './controls/controls-card.component';
import { ControlsCardRevealComponent } from './controls/controls-card-reveal.component';
import { ControlsCribaComponent } from './controls/controls-criba.component';
import { ControlsVictoryComponent } from './controls/controls-victory.component';

@Component({
  selector: 'app-streamer',
  standalone: true,
  imports: [
    UpperCasePipe,
    ControlsIdleComponent, ControlsLobbyComponent, ControlsCardComponent,
    ControlsCardRevealComponent, ControlsCribaComponent, ControlsVictoryComponent
  ],
  template: `
    <div class="streamer-root">
      <header class="s-header">
        <div class="s-title">
          <span class="heart"></span>
          STREAMER PANEL
        </div>
        <div class="s-phase-badge">
          FASE: <span class="phase-name">{{ store.phase() | uppercase }}</span>
        </div>
        <div class="s-card-info">
          @if (store.state()?.pack) {
            {{ store.state()!.pack!.name }} ·
            CARTA {{ store.state()!.cardIndex + 1 }}/{{ store.state()!.pack!.cards.length }}
          }
        </div>
      </header>

      <main class="s-main">
        @if (connectionError()) {
          <div class="conn-error">
            ⚠ Error de conexión: {{ connectionError() }}<br>
            <button (click)="ngOnInit()">Reintentar</button>
          </div>
        }

        @if (devMode()) {
          <div class="dev-banner">⚙ DEV MODE — botones extra activos (solo entorno Development)</div>
        }

        @switch (store.phase()) {
          @case ('idle')            { <controls-idle [packs]="packs()" /> }
          @case ('lobby')           { <controls-lobby [packs]="packs()" [devMode]="devMode()" /> }
          @case ('card')            { <controls-card [devMode]="devMode()" /> }
          @case ('cardReveal')      { <controls-card-reveal /> }
          @case ('tallyTransition') { <controls-criba /> }
          @case ('criba')           { <controls-criba /> }
          @case ('victory')         { <controls-victory [packs]="packs()" /> }
          @default                  { <controls-idle [packs]="packs()" /> }
        }
      </main>
    </div>
  `,
  styles: [`
    .streamer-root {
      min-height: 100vh;
      background: var(--c-void);
      display: flex; flex-direction: column;
      font-family: var(--font-title);
    }
    .s-header {
      background: var(--c-night);
      border-bottom: 4px solid var(--c-flame);
      padding: var(--u2) var(--u3);
      display: grid; grid-template-columns: auto 1fr auto;
      align-items: center; gap: var(--u3);
    }
    .s-title {
      display: flex; align-items: center; gap: var(--u);
      font-size: var(--fs-md); color: var(--c-flame);
    }
    .heart {
      display: inline-block; width: 18px; height: 18px;
      background: var(--c-flame);
      clip-path: polygon(
        0 25%, 25% 25%, 25% 0, 41% 0, 41% 25%, 58% 25%, 58% 0, 75% 0, 75% 25%, 100% 25%,
        100% 75%, 75% 75%, 75% 100%, 58% 100%, 58% 75%, 41% 75%, 41% 100%, 25% 100%, 25% 75%, 0 75%
      );
    }
    .s-phase-badge {
      text-align: center;
      font-size: var(--fs-sm); color: var(--c-ash);
    }
    .phase-name { color: var(--c-gold); }
    .s-card-info {
      text-align: right;
      font-size: var(--fs-xs); color: var(--c-bone);
    }
    .s-main {
      flex: 1; padding: var(--u4); max-width: 960px; margin: 0 auto; width: 100%;
    }
    .conn-error {
      color: var(--c-danger);
      font-family: var(--font-body);
      font-size: var(--fs-body);
      padding: var(--u3);
      border: 4px solid var(--c-danger);
      background: var(--c-dusk);
      margin-bottom: var(--u2);
    }
    .conn-error button {
      font-family: var(--font-title); font-size: var(--fs-sm);
      background: var(--c-danger); color: var(--c-void);
      border: none; padding: var(--u) var(--u3);
      cursor: pointer; margin-top: var(--u);
    }
    .conn-error button:hover { background: var(--c-paper); color: var(--c-danger); }
    .dev-banner {
      background: repeating-linear-gradient(45deg,
        var(--c-gold) 0 12px, var(--c-dusk) 12px 24px);
      color: var(--c-void);
      font-family: var(--font-title); font-size: var(--fs-xs);
      padding: var(--u) var(--u2);
      border: 2px dashed var(--c-void);
      margin-bottom: var(--u2);
      text-align: center; letter-spacing: 1px;
    }
  `]
})
export class StreamerComponent implements OnInit {
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);
  protected packs = signal<PackDto[]>([]);
  protected connectionError = signal('');
  /** Enabled with ?dev=1 in the URL. Server still gates the actual mutations
   *  (IWebHostEnvironment.IsDevelopment) — this flag only toggles the UI. */
  protected devMode = signal(new URLSearchParams(location.search).get('dev') === '1');

  async ngOnInit(): Promise<void> {
    this.connectionError.set('');
    try {
      await this.sr.connect(
        (s) => this.store.state.set(s as GameStateDto | null),
        (w) => this.store.winners.set(w as GameWinnerDto[])
      );
      try {
        const packs = await this.sr.invoke<PackDto[]>('ListPacks');
        this.packs.set(packs ?? []);
      } catch (e) {
        console.warn('Could not load packs:', e);
      }
    } catch (e: any) {
      this.connectionError.set(e?.message ?? 'No se puede conectar al servidor');
    }
  }
}
