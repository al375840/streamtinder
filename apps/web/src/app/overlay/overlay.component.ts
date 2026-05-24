import { Component, OnInit, inject, computed } from '@angular/core';
import { SignalRService } from '../core/signalr.service';
import { GameStateStore, GameStateDto, GameWinnerDto } from '../core/game-state.store';
import { PhaseIdleComponent } from './phases/phase-idle.component';
import { PhaseLobbyComponent } from './phases/phase-lobby.component';
import { PhaseCardComponent } from './phases/phase-card.component';
import { PhaseCardRevealComponent } from './phases/phase-card-reveal.component';
import { PhaseTallyComponent } from './phases/phase-tally.component';
import { PhaseCribaComponent } from './phases/phase-criba.component';
import { PhaseVictoryComponent } from './phases/phase-victory.component';

@Component({
  selector: 'app-overlay',
  standalone: true,
  imports: [
    PhaseIdleComponent, PhaseLobbyComponent, PhaseCardComponent,
    PhaseCardRevealComponent, PhaseTallyComponent, PhaseCribaComponent, PhaseVictoryComponent
  ],
  template: `
    <div class="overlay-root">
      <!-- TOP CHROME -->
      <div class="ov-topbar">
        <div class="ov-pack">
          <span class="heart"></span>
          <span>{{ store.state()?.pack?.name ?? 'STREAMER TINDER' }}</span>
        </div>
        <div class="ov-question" [style.opacity]="showCardUi() ? 1 : 0.35">
          {{ store.state()?.pack?.question ?? '' }}
        </div>
        <div class="ov-stats">
          @if (showCardUi()) {
            <div class="card-counter">
              {{ phase() === 'victory' ? 'PARTIDA · ' + totalCards() + '/' + totalCards() : 'CARTA ' + (cardIndex() + 1) + ' / ' + totalCards() }}
            </div>
          }
          <div class="streamer-voted" [class.pending]="streamerVotePending()" [class.urgent]="phase() === 'card'">
            <span class="dot"></span>
            {{ streamerVotePending() ? 'STREAMER PENDIENTE' : 'STREAMER DECIDIÓ' }}
          </div>
        </div>
      </div>

      <!-- STAGE CONTENT -->
      <div class="stage-content">
        @switch (store.phase()) {
          @case ('idle')            { <phase-idle /> }
          @case ('lobby')           { <phase-lobby /> }
          @case ('card')            { <phase-card /> }
          @case ('cardReveal')      { <phase-card-reveal /> }
          @case ('tallyTransition') { <phase-tally /> }
          @case ('criba')           { <phase-criba /> }
          @case ('victory')         { <phase-victory /> }
          @default                  { <phase-idle /> }
        }
      </div>

      <!-- BOTTOM CHROME -->
      <div class="ov-bottombar" [innerHTML]="bottombarHtml()"></div>
    </div>
  `,
  styles: [`
    .overlay-root {
      position: relative;
      width: 1280px; height: 720px;
      background: var(--c-night);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .ov-topbar {
      flex-shrink: 0;
      height: 60px;
      background: var(--c-dusk);
      border-bottom: 4px solid var(--c-flame);
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      padding: 0 var(--u3);
      gap: var(--u3);
      z-index: 10;
    }
    .ov-pack {
      display: flex; align-items: center; gap: var(--u2);
      font-family: var(--font-title); font-size: 14px; color: var(--c-paper);
    }
    .ov-pack .heart {
      width: 18px; height: 18px; background: var(--c-flame);
      clip-path: polygon(
        0 25%, 25% 25%, 25% 0, 41% 0, 41% 25%, 58% 25%, 58% 0, 75% 0, 75% 25%, 100% 25%,
        100% 75%, 75% 75%, 75% 100%, 58% 100%, 58% 75%, 41% 75%, 41% 100%, 25% 100%, 25% 75%, 0 75%
      );
    }
    .ov-question {
      font-family: var(--font-title); font-size: 18px;
      color: var(--c-flame); text-align: center;
      text-shadow: 3px 3px 0 var(--c-void);
      letter-spacing: 2px;
      transition: none;
    }
    .ov-stats {
      display: flex; gap: var(--u2); align-items: center;
      font-family: var(--font-title); font-size: 11px; color: var(--c-bone);
    }
    .card-counter {
      background: var(--c-void); color: var(--c-paper);
      padding: 4px 8px; border: 2px solid var(--c-paper);
    }
    .streamer-voted {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 8px; border: 2px solid var(--c-gold);
      background: var(--c-void); color: var(--c-gold);
      font-size: 9px; letter-spacing: 1px;
    }
    .streamer-voted .dot {
      width: 10px; height: 10px; background: var(--c-gold);
      animation: pixel-blink 0.6s step-end infinite;
    }
    .streamer-voted.pending {
      color: var(--c-stone); border-color: var(--c-stone);
    }
    .streamer-voted.pending .dot { background: var(--c-stone); animation: none; }
    .streamer-voted.urgent .dot { animation-duration: 0.3s; }

    .stage-content {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    .ov-bottombar {
      flex-shrink: 0;
      height: 44px;
      background: var(--c-dusk);
      border-top: 4px solid var(--c-flame);
      display: flex; align-items: center;
      padding: 0 var(--u3);
      z-index: 10;
      font-family: var(--font-title); font-size: 11px;
      color: var(--c-bone); gap: var(--u3);
    }
  `]
})
export class OverlayComponent implements OnInit {
  protected store = inject(GameStateStore);
  private sr = inject(SignalRService);

  protected readonly phase = this.store.phase;
  protected readonly cardIndex = computed(() => this.store.state()?.cardIndex ?? 0);
  protected readonly totalCards = computed(() => this.store.state()?.pack?.cards.length ?? 10);
  protected readonly showCardUi = computed(() => {
    const p = this.phase();
    return p !== 'idle' && p !== 'lobby';
  });
  protected readonly streamerVotePending = computed(() => {
    const p = this.phase();
    return p === 'idle' || p === 'lobby' || (p === 'card' && !this.store.state()?.streamerVote);
  });
  protected readonly bottombarHtml = computed(() => {
    const p = this.phase();
    if (p === 'idle') return '<span>STREAM EN PAUSA · espera al streamer</span><span style="margin-left:auto;color:var(--c-ash);font-size:9px">/leaderboard</span>';
    if (p === 'lobby') return '<span>ÚNETE:</span><span><span style="color:var(--c-flame)">!join</span></span><span>SAL:</span><span><span style="color:var(--c-ice)">!leave</span></span><span style="margin-left:auto;color:var(--c-ash);font-size:9px">cap 60</span>';
    if (p === 'card') return '<span>VOTA EN CHAT:</span><span><span style="color:var(--c-flame)">!izq</span> = NO</span><span><span style="color:var(--c-ice)">!der</span> = SÍ</span><span style="font-size:9px;color:var(--c-ash)">aliases · !l/!r · !1/!2 · !si/!no</span><span style="margin-left:auto;color:var(--c-gold)">SÓLO PRIMER VOTO CUENTA</span>';
    if (p === 'cardReveal') return '<span style="color:var(--c-gold)">REVELANDO...</span><span style="margin-left:auto;color:var(--c-ash);font-size:9px">siguiente carta en breve</span>';
    if (p === 'tallyTransition') return '<span style="color:var(--c-flame)">LAS 10 CARTAS HAN TERMINADO</span><span style="margin-left:auto;color:var(--c-ash);font-size:9px">preparando criba...</span>';
    if (p === 'criba') return '<span style="color:var(--c-danger)">CRIBA EN CURSO</span><span style="color:var(--c-bone);font-size:9px">el streamer elimina tiers · sin orden · sin undo</span><span style="margin-left:auto;color:var(--c-ash);font-size:9px">en directo</span>';
    if (p === 'victory') return '<span style="color:var(--c-gold)">¡PARTIDA TERMINADA!</span><span style="color:var(--c-bone);font-size:9px">tabla visible 15-20s</span><span style="margin-left:auto;color:var(--c-paper)">/leaderboard global</span>';
    return '';
  });

  async ngOnInit(): Promise<void> {
    // SignalR delivers unknown — cast to the DTOs we know the hub sends.
    // Full runtime validation (Zod) is not warranted for this use-case.
    await this.sr.connect(
      (s) => this.store.state.set(s as GameStateDto | null),
      (w) => this.store.winners.set(w as GameWinnerDto[])
    );
  }
}
