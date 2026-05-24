import { Component } from '@angular/core';

@Component({
  selector: 'app-overlay',
  standalone: true,
  template: `<div class="overlay-shell">OVERLAY (pendiente)</div>`,
  styles: [`.overlay-shell { padding: 64px; font-family: var(--font-title); color: var(--c-bone); }`]
})
export class OverlayComponent {}
