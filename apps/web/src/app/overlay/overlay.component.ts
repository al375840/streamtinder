import { Component, OnInit, inject } from '@angular/core';
import { SignalRService } from '../core/signalr.service';
import { GameStateStore } from '../core/game-state.store';
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
    PhaseIdleComponent,
    PhaseLobbyComponent,
    PhaseCardComponent,
    PhaseCardRevealComponent,
    PhaseTallyComponent,
    PhaseCribaComponent,
    PhaseVictoryComponent
  ],
  template: `
    <div class="overlay-root">
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
  `,
  styles: [`
    .overlay-root {
      width: 100vw;
      min-height: 100vh;
      background: var(--c-night, #1a1428);
      overflow: hidden;
    }
  `]
})
export class OverlayComponent implements OnInit {
  protected store = inject(GameStateStore);
  private sr = inject(SignalRService);

  async ngOnInit(): Promise<void> {
    await this.sr.connect(
      (s) => this.store.state.set(s as any),
      (w) => this.store.winners.set(w as any)
    );
  }
}
