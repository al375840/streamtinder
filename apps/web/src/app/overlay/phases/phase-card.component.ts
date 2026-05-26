import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, computed, signal, effect } from '@angular/core';
import { GameStateStore } from '../../core/game-state.store';
import { RoamersService } from './roamers.service';

@Component({
  selector: 'phase-card',
  standalone: true,
  template: `
    <div class="phase-card">
      <canvas class="roamers-layer" #roamersCanvas></canvas>
      <div class="swipe-stage">
        <!-- LEFT: NO -->
        <div class="swipe-aff left">
          <div class="arrow pulse">←</div>
          <div class="cmd-box">!izq</div>
          <div class="label">NO</div>
          <div class="alias">aliases<br>!l · !1 · !no</div>
          <div class="vote-count">{{ leftVotes() }}</div>
        </div>

        <!-- CENTER: CARD -->
        <div class="swipe-card">
          <div class="card-progress">
            @for (pip of pips(); track $index) {
              <div class="pip" [class.done]="pip === 'done'" [class.current]="pip === 'current'"></div>
            }
          </div>
          <div class="card-image">
            @if (card()?.imagePath) {
              <img [src]="card()!.imagePath" alt="" />
            } @else {
              <span>[ {{ card()?.id ?? '???' }} ]</span>
            }
          </div>
          <div class="card-name">{{ card()?.id ?? '???' }}</div>
          @if (card()?.subtitle) {
            <div class="card-subtitle">{{ card()!.subtitle }}</div>
          }
          <div class="card-timer" [class.urgent]="timerUrgent()">{{ timerDisplay() }}</div>
        </div>

        <!-- RIGHT: SÍ -->
        <div class="swipe-aff right">
          <div class="arrow pulse">→</div>
          <div class="cmd-box">!der</div>
          <div class="label">SÍ</div>
          <div class="alias">aliases<br>!r · !2 · !si</div>
          <div class="vote-count">{{ rightVotes() }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .phase-card { width: 100%; height: 100%; position: relative; }
    .roamers-layer {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 5;            /* above the card image, below topbar/bottombar (clipped anyway) */
      image-rendering: pixelated;
    }
    .swipe-stage {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: grid; grid-template-columns: 220px 1fr 220px;
      align-items: center; padding: var(--u3);
    }
    .swipe-aff {
      display: flex; flex-direction: column; align-items: center; gap: var(--u);
      padding: var(--u3); height: 100%; justify-content: center;
    }
    .arrow {
      font-family: var(--font-title); font-size: 80px; line-height: 1;
    }
    .swipe-aff.left  .arrow { color: var(--c-danger); text-shadow: 4px 4px 0 var(--c-void); }
    .swipe-aff.right .arrow { color: var(--c-success); text-shadow: 4px 4px 0 var(--c-void); }
    .cmd-box {
      font-family: var(--font-title); font-size: 28px; padding: var(--u2);
      background: var(--c-void);
    }
    .swipe-aff.left  .cmd-box { color: var(--c-danger); border: 4px solid var(--c-danger); }
    .swipe-aff.right .cmd-box { color: var(--c-success); border: 4px solid var(--c-success); }
    .label { font-family: var(--font-title); font-size: 11px; color: var(--c-bone); }
    .alias { font-family: var(--font-title); font-size: 8px; color: var(--c-stone); text-align: center; line-height: 1.4; }
    .vote-count {
      font-family: var(--font-title); font-size: 22px; color: var(--c-paper);
      margin-top: var(--u);
    }
    .swipe-card {
      background: var(--c-paper); color: var(--c-void);
      border: 8px solid var(--c-void);
      box-shadow: var(--shadow-pixel-lg);
      padding: var(--u2);
      display: flex; flex-direction: column;
      margin: 0 auto; width: 420px; max-width: 100%; height: 100%;
      max-height: 540px; position: relative;
    }
    .card-image {
      flex: 1; background: var(--c-night);
      border: 4px solid var(--c-void);
      display: flex; align-items: center; justify-content: center;
      background-image: repeating-linear-gradient(45deg, var(--c-night) 0 12px, var(--c-dusk) 12px 24px);
      margin-bottom: var(--u);
      color: var(--c-bone); font-family: var(--font-title); font-size: 12px;
    }
    .card-image img { width: 70%; height: 70%; object-fit: contain; }
    .card-name {
      font-family: var(--font-title); font-size: 28px;
      color: var(--c-void); text-align: center; padding: var(--u);
    }
    .card-subtitle {
      font-family: var(--font-body); font-size: 22px;
      color: #555; text-align: center;
      padding: 0 var(--u);
      border-top: 2px dashed #999; padding-top: var(--u-half);
    }
    .card-progress {
      position: absolute; top: 14px; left: 14px;
      display: flex; gap: 4px; z-index: 5;
    }
    .pip { width: 18px; height: 6px; background: var(--c-stone); border: 1px solid var(--c-void); }
    .pip.done { background: var(--c-flame); }
    .pip.current { background: var(--c-gold); animation: pixel-blink 0.6s step-end infinite; }
    .card-timer {
      position: absolute; top: 14px; right: 14px;
      font-family: var(--font-title); font-size: 18px;
      color: var(--c-warn); background: var(--c-void);
      border: 3px solid var(--c-warn); padding: 3px 8px; z-index: 5;
    }
    .card-timer.urgent { color: var(--c-danger); border-color: var(--c-danger); animation: pixel-blink 0.4s step-end infinite; }
  `]
})
export class PhaseCardComponent implements OnInit, OnDestroy {
  protected store = inject(GameStateStore);
  private roamers = inject(RoamersService);
  @ViewChild('roamersCanvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  protected readonly card = this.store.currentCard;
  protected readonly timerDisplay = signal('0:10');
  protected readonly timerUrgent = signal(false);
  private _interval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Re-sync roamers whenever lobby players, current votes, or cardIndex changes.
    // The canvas/rAF loop is independent of this — runs at 60fps regardless.
    effect(() => {
      const s = this.store.state();
      if (!s || s.phase !== 'card') return;
      const nicks = Object.keys(s.aciertosByNick);
      const votes: Record<string, 'left' | 'right'> = {};
      for (const [n, v] of Object.entries(s.currentCardVotes)) votes[n] = v.direction;
      this.roamers.sync({ nicks, votes, cardIndex: s.cardIndex });
    });
  }

  protected readonly pips = computed(() => {
    const idx = this.store.state()?.cardIndex ?? 0;
    return Array.from({ length: 10 }, (_, i) =>
      i < idx ? 'done' : i === idx ? 'current' : 'empty'
    );
  });
  protected readonly leftVotes = computed(() => {
    const votes = this.store.state()?.currentCardVotes ?? {};
    return Object.values(votes).filter(v => v.direction === 'left').length;
  });
  protected readonly rightVotes = computed(() => {
    const votes = this.store.state()?.currentCardVotes ?? {};
    return Object.values(votes).filter(v => v.direction === 'right').length;
  });

  ngOnInit(): void {
    this._tick();
    this._interval = setInterval(() => this._tick(), 1000);
    // Stage dims match the overlay's stage-content: 1280 wide, 720 minus
    // topbar (60) and bottombar (44) = 616 tall. The CSS `width:100%` on the
    // canvas scales the 1280x616 buffer to whatever size the overlay renders at.
    this.roamers.start(this.canvasRef.nativeElement, 1280, 616);
  }
  ngOnDestroy(): void {
    if (this._interval) clearInterval(this._interval);
    this.roamers.stop();
  }
  private _tick(): void {
    const endsAt = this.store.state()?.cardTimerEndsAt;
    if (!endsAt) { this.timerDisplay.set('0:10'); this.timerUrgent.set(false); return; }
    const secs = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    this.timerDisplay.set(`${m}:${String(s).padStart(2, '0')}`);
    this.timerUrgent.set(secs <= 3);
  }
}
