import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { renderSprite, spriteFor, SpriteState } from './sprite.engine';

@Component({
  selector: 'app-sprite',
  standalone: true,
  template: `
    <div class="sprite-wrap" [style.--scale]="scale">
      <canvas #c width="24" height="30"></canvas>
      <span class="nick">{{ nick }}</span>
    </div>
  `,
  styles: [`
    .sprite-wrap {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    canvas {
      width: calc(24px * var(--scale, 2));
      height: calc(30px * var(--scale, 2));
      image-rendering: pixelated;
    }
    .nick {
      font-family: var(--font-title);
      font-size: var(--fs-xs, 8px);
      color: var(--c-bone);
      text-shadow: 1px 1px 0 var(--c-void);
      max-width: calc(24px * var(--scale, 2));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class SpriteComponent implements OnChanges {
  @Input() nick = '';
  @Input() scale = 2;
  @Input() state: SpriteState = 'normal';
  @Input() packPalette?: string[];
  @ViewChild('c', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  ngOnChanges(): void {
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 24, 30);
    renderSprite(ctx, spriteFor(this.nick, this.packPalette), { state: this.state });
  }
}
