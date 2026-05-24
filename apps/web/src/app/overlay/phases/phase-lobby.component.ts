import { Component } from '@angular/core';

@Component({
  selector: 'phase-lobby',
  standalone: true,
  template: `<div class="phase-placeholder">LOBBY</div>`,
  styles: [`.phase-placeholder { padding: 32px; font-family: var(--font-title); color: var(--c-bone); font-size: var(--fs-sm, 12px); }`]
})
export class PhaseLobbyComponent {}
