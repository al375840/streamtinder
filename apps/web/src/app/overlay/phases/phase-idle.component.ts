import { Component } from '@angular/core';
import { SpriteComponent } from '../../ui/sprite/sprite.component';

@Component({
  selector: 'phase-idle',
  standalone: true,
  imports: [SpriteComponent],
  template: `
    <div class="phase-idle">
      <h1 class="blink">STAND BY</h1>
      <p class="lede">
        El streamer aún no ha abierto un lobby.<br>
        Espera a que pulse <strong>ABRIR LOBBY</strong> y podrás unirte.
      </p>
      <div class="pacers">
        <div class="pacer bob-0"><app-sprite nick="pixel_pacer" [scale]="4" /></div>
        <div class="pacer bob-1"><app-sprite nick="ramenboss22" [scale]="4" /></div>
        <div class="pacer bob-2"><app-sprite nick="bitwarrior"  [scale]="4" /></div>
        <div class="pacer bob-3"><app-sprite nick="crt_kid"     [scale]="4" /></div>
      </div>
    </div>
  `,
  styles: [`
    .phase-idle {
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center;
    }
    h1 {
      font-family: var(--font-title); font-size: 64px;
      color: var(--c-flame); letter-spacing: 4px;
      text-shadow: 6px 6px 0 var(--c-void);
      margin-bottom: var(--u3);
    }
    .lede {
      font-family: var(--font-body); font-size: 28px;
      color: var(--c-bone); margin-bottom: var(--u4);
      max-width: 60ch;
      line-height: 1.4;
    }
    .lede strong { color: var(--c-flame); font-family: var(--font-title); font-size: 18px; }
    .pacers { display: flex; gap: var(--u4); margin-top: var(--u3); }
    .pacer { display: flex; flex-direction: column; align-items: center; }
    .bob-0 { animation: pixel-bob 1.2s steps(4) infinite; }
    .bob-1 { animation: pixel-bob 1.2s steps(4) infinite 0.2s; }
    .bob-2 { animation: pixel-bob 1.2s steps(4) infinite 0.4s; }
    .bob-3 { animation: pixel-bob 1.2s steps(4) infinite 0.6s; }
  `]
})
export class PhaseIdleComponent {}
