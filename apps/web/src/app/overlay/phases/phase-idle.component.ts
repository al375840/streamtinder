import { Component } from '@angular/core';

@Component({
  selector: 'phase-idle',
  standalone: true,
  template: `<div class="phase-placeholder">IDLE — Stand By</div>`,
  styles: [`.phase-placeholder { padding: 32px; font-family: var(--font-title); color: var(--c-bone); font-size: var(--fs-sm, 12px); }`]
})
export class PhaseIdleComponent {}
