import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface LeaderboardRow {
  rank: number;
  nick: string;
  points: number;
  games: number;
  wins: number;
  last_played_at: string;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [],
  template: `
    <div class="lb-wrap">
      <h1>LEADERBOARD</h1>

      <input
        type="text"
        [value]="search()"
        (input)="onSearch($any($event.target).value)"
        placeholder="soy @nick — resalta tu fila"
      />

      @if (loading()) {
        <p class="status-msg">Cargando...</p>
      } @else if (error()) {
        <p class="status-msg error">{{ error() }}</p>
      } @else if (rows().length === 0) {
        <p class="status-msg">Sin resultados todavía. ¡Juega una partida!</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nick</th>
              <th>Pts</th>
              <th>Partidas</th>
              <th>Ganadas</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.nick) {
              <tr [class.me]="isMe(r.nick)">
                <td class="rk">{{ r.rank }}</td>
                <td class="nick">{{ r.nick }}</td>
                <td class="pts">{{ r.points }}</td>
                <td class="num">{{ r.games }}</td>
                <td class="num">{{ r.wins }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .lb-wrap {
      max-width: 800px; margin: 0 auto;
      padding: var(--u4); display: flex; flex-direction: column; gap: var(--u3);
    }
    h1 {
      font-family: var(--font-title); font-size: var(--fs-xl);
      color: var(--c-flame); letter-spacing: 2px;
      text-shadow: 4px 4px 0 var(--c-void);
    }
    input {
      font-family: var(--font-body); font-size: var(--fs-body);
      padding: var(--u) var(--u2);
      background: var(--c-dusk); color: var(--c-bone);
      border: var(--border-2) solid var(--c-stone);
      width: 100%; max-width: 360px;
    }
    input:focus { outline: none; border-color: var(--c-flame); }
    input::placeholder { color: var(--c-stone); }
    .status-msg {
      font-family: var(--font-body); font-size: var(--fs-body);
      color: var(--c-ash); padding: var(--u2);
    }
    .status-msg.error { color: var(--c-danger); }
    table {
      width: 100%; border-collapse: collapse;
      background: var(--c-dusk);
      border: var(--border-2) solid var(--c-stone);
      box-shadow: var(--shadow-pixel-lg);
    }
    th {
      font-family: var(--font-title); font-size: var(--fs-xs);
      color: var(--c-ash); letter-spacing: 1px;
      padding: var(--u) var(--u2);
      background: var(--c-night);
      border-bottom: var(--border-2) solid var(--c-flame);
      text-align: left;
    }
    td {
      font-family: var(--font-body); font-size: var(--fs-body);
      padding: var(--u) var(--u2);
      border-bottom: 1px dashed var(--c-stone);
      color: var(--c-bone);
    }
    .rk { font-family: var(--font-title); font-size: var(--fs-sm); color: var(--c-paper); width: 40px; }
    .nick { font-family: var(--font-title); font-size: var(--fs-sm); color: var(--c-paper); }
    .pts { font-family: var(--font-title); font-size: var(--fs-sm); color: var(--c-gold); }
    .num { color: var(--c-ash); }
    tr.me td { background: var(--c-flame-dk); color: var(--c-paper); }
    tr.me .pts { color: var(--c-gold); }
    tr:last-child td { border-bottom: none; }
  `]
})
export class LeaderboardComponent implements OnInit {
  private route = inject(ActivatedRoute);

  readonly rows = signal<LeaderboardRow[]>([]);
  readonly search = signal<string>('');
  readonly loading = signal(true);
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    // Pre-fill search from ?highlight=nick query param
    this.route.queryParamMap.subscribe(q => {
      const hl = q.get('highlight');
      if (hl) this.search.set(hl);
    });

    try {
      const resp = await fetch('/api/leaderboard?limit=100&offset=0');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      this.rows.set(json.rows ?? []);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error al cargar el leaderboard');
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(value: string): void {
    this.search.set(value.trim());
  }

  isMe(nick: string): boolean {
    const s = this.search();
    return s.length > 0 && nick.toLowerCase() === s.toLowerCase();
  }
}
