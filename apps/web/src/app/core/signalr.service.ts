import { Injectable, OnDestroy, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {
  private conn?: signalR.HubConnection;
  readonly connected = signal(false);

  async connect(
    onState: (s: unknown) => void,
    onWinners: (w: unknown) => void
  ): Promise<void> {
    if (this.conn) return;

    this.conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/game')
      .withAutomaticReconnect()
      .build();

    this.conn.on('state', onState);
    this.conn.on('winners', onWinners);
    this.conn.onreconnected(() => this.connected.set(true));
    this.conn.onclose(() => this.connected.set(false));

    await this.conn.start();
    this.connected.set(true);
  }

  invoke<T = void>(method: string, ...args: unknown[]): Promise<T> {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.invoke<T>(method, ...args);
  }

  async ngOnDestroy(): Promise<void> {
    await this.conn?.stop();
  }
}
