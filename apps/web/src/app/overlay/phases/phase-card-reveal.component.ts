import { Component } from '@angular/core';

@Component({
  selector: 'phase-card-reveal',
  standalone: true,
  template: `<div class="phase-placeholder">CARD REVEAL</div>`,
  styles: [`.phase-placeholder { padding: 32px; font-family: var(--font-title); color: var(--c-bone); font-size: var(--fs-sm, 12px); }`]
})
export class PhaseCardRevealComponent {}
