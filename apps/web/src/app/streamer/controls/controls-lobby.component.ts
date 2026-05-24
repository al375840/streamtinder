import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameStateStore } from '../../core/game-state.store';
import { SignalRService } from '../../core/signalr.service';

@Component({
  selector: 'controls-lobby',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ctrl-lobby">
      <h2>LOBBY · {{ store.lobbyPlayers().length }} / 60</h2>

      <div class="lobby-actions">
        <button class="btn-primary" (click)="startGame()"
                [disabled]="store.lobbyPlayers().length < 10 || busy()">
          ▶ INICIAR PARTIDA
          @if (store.lobbyPlayers().length < 10) {
            <small>(mínimo 10 jugadores)</small>
          }
        </button>

        <button class="btn-danger" (click)="vaciarLobby()" [disabled]="busy()">
          × VACIAR LOBBY
        </button>
      </div>

      @if (errorMsg) { <p class="error-msg">{{ errorMsg }}</p> }

      <div class="ban-row">
        <label>BANEAR NICK</label>
        <div class="ban-input">
          <input type="text" [(ngModel)]="banNick" placeholder="nick_a_banear" maxlength="25"
                 (keyup.enter)="ban()" />
          <button class="btn-ban" (click)="ban()" [disabled]="!banNick.trim() || busy()">BAN</button>
        </div>
        @if (banMsg) { <p class="ban-msg">{{ banMsg }}</p> }
      </div>

      <div class="player-list">
        @for (p of store.lobbyPlayers(); track p.nick) {
          <div class="player-row">
            <span>{{'@'}}{{ p.nick }}</span>
            <button class="btn-mini-ban" (click)="banPlayer(p.nick)"
                    [disabled]="banBusy() === p.nick">ban</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .ctrl-lobby { display: flex; flex-direction: column; gap: var(--u3); }
    h2 { font-size: var(--fs-lg); color: var(--c-paper); }
    .lobby-actions { display: flex; gap: var(--u2); flex-wrap: wrap; }
    .btn-primary {
      font-family: var(--font-title); font-size: var(--fs-sm);
      background: var(--c-flame); color: var(--c-void);
      border: none; padding: var(--u2) var(--u4);
      cursor: pointer; box-shadow: var(--shadow-pixel);
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .btn-primary:hover:not(:disabled) { background: var(--c-paper); }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-primary small { font-size: 8px; color: var(--c-void); opacity: 0.8; }
    .btn-danger {
      font-family: var(--font-title); font-size: var(--fs-sm);
      background: var(--c-danger); color: var(--c-void);
      border: none; padding: var(--u2) var(--u3);
      cursor: pointer; box-shadow: var(--shadow-pixel);
    }
    .btn-danger:hover:not(:disabled) { background: var(--c-paper); color: var(--c-danger); }
    .btn-danger:disabled { opacity: 0.4; cursor: not-allowed; }
    .ban-row { display: flex; flex-direction: column; gap: var(--u-half); }
    label { font-size: var(--fs-xs); color: var(--c-ash); letter-spacing: 1px; }
    .ban-input { display: flex; gap: var(--u); }
    input {
      font-family: var(--font-title); font-size: var(--fs-sm);
      background: var(--c-dusk); color: var(--c-bone);
      border: 2px solid var(--c-stone); padding: var(--u) var(--u2);
      flex: 1; max-width: 300px;
    }
    input:focus { outline: none; border-color: var(--c-flame); }
    .btn-ban {
      font-family: var(--font-title); font-size: var(--fs-xs);
      background: var(--c-danger-dk); color: var(--c-bone);
      border: 2px solid var(--c-danger); padding: var(--u) var(--u2);
      cursor: pointer;
    }
    .btn-ban:disabled { opacity: 0.4; cursor: not-allowed; }
    .ban-msg { font-size: var(--fs-xs); color: var(--c-success); }
    .error-msg { color: var(--c-danger); font-size: var(--fs-xs); margin-top: var(--u); }
    .player-list {
      display: flex; flex-direction: column; gap: 4px;
      max-height: 400px; overflow-y: auto;
      background: var(--c-dusk); border: 2px solid var(--c-stone);
      padding: var(--u);
    }
    .player-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px var(--u); font-family: var(--font-body); font-size: var(--fs-body-sm);
      color: var(--c-bone); border-bottom: 1px dashed var(--c-stone);
    }
    .btn-mini-ban {
      font-family: var(--font-title); font-size: 8px;
      background: transparent; color: var(--c-danger);
      border: 1px solid var(--c-danger); padding: 2px 6px;
      cursor: pointer;
    }
    .btn-mini-ban:hover:not(:disabled) { background: var(--c-danger); color: var(--c-void); }
    .btn-mini-ban:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class ControlsLobbyComponent {
  protected store = inject(GameStateStore);
  protected sr = inject(SignalRService);
  protected banNick = '';
  protected banMsg = '';
  protected busy = signal(false);
  protected banBusy = signal('');
  protected errorMsg = '';

  protected async startGame(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.errorMsg = '';
    try {
      await this.sr.invoke('StartGame');
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al iniciar la partida';
    } finally {
      this.busy.set(false);
    }
  }

  protected async vaciarLobby(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.errorMsg = '';
    try {
      await this.sr.invoke('VaciarLobby');
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al vaciar el lobby';
    } finally {
      this.busy.set(false);
    }
  }

  protected async ban(): Promise<void> {
    if (!this.banNick.trim() || this.busy()) return;
    this.busy.set(true);
    this.errorMsg = '';
    try {
      await this.sr.invoke('Ban', this.banNick.trim());
      this.banMsg = `${this.banNick.trim()} baneado`;
      this.banNick = '';
      setTimeout(() => this.banMsg = '', 3000);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al banear';
    } finally {
      this.busy.set(false);
    }
  }

  protected async banPlayer(nick: string): Promise<void> {
    if (this.banBusy()) return;
    this.banBusy.set(nick);
    this.errorMsg = '';
    try {
      await this.sr.invoke('Ban', nick);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al banear jugador';
    } finally {
      this.banBusy.set('');
    }
  }
}
