import { Component } from '@angular/core';

@Component({
  selector: 'phase-victory',
  standalone: true,
  template: `<div class="phase-placeholder">VICTORY</div>`,
  styles: [`.phase-placeholder { padding: 32px; font-family: var(--font-title); color: var(--c-bone); font-size: var(--fs-sm, 12px); }`]
})
export class PhaseVictoryComponent {}
