import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CardDto  { id: string; imagePath: string; subtitle: string | null; }
interface PackDto  { id: string; name: string; question: string; palettePrimary: string; paletteAccent: string; cards: CardDto[]; }

@Component({
  selector: 'app-packs-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="preview-root">
      <h1 class="title">PACKS · PREVIEW</h1>

      @if (loading()) {
        <p class="state">Cargando packs…</p>
      } @else if (error()) {
        <p class="state error">{{ error() }}</p>
      } @else {
        @for (pack of packs(); track pack.id) {
          <section class="pack" [style.--primary]="pack.palettePrimary" [style.--accent]="pack.paletteAccent">
            <header class="pack-header">
              <span class="pack-name">{{ pack.name }}</span>
              <span class="pack-question">{{ pack.question }}</span>
              <span class="pack-count">{{ pack.cards.length }} cartas</span>
            </header>
            <div class="card-grid">
              @for (card of pack.cards; track card.id) {
                <div class="card">
                  <div class="card-img-wrap">
                    <img [src]="card.imagePath" [alt]="card.subtitle ?? card.id"
                         (error)="onImgError($event)" />
                  </div>
                  <div class="card-label">{{ card.subtitle ?? card.id }}</div>
                </div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .preview-root {
      min-height: 100vh;
      background: #0d0d1a;
      padding: 32px;
      font-family: 'Courier New', monospace;
      color: #e0e0e0;
    }
    .title {
      font-size: 32px;
      letter-spacing: 6px;
      color: #ff3d9a;
      margin-bottom: 40px;
      border-bottom: 2px solid #ff3d9a;
      padding-bottom: 12px;
    }
    .state { font-size: 16px; opacity: 0.6; }
    .error { color: #ff4444; }

    .pack {
      margin-bottom: 48px;
      border: 2px solid var(--primary, #ff3d9a);
      padding: 24px;
    }
    .pack-header {
      display: flex;
      align-items: baseline;
      gap: 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .pack-name {
      font-size: 22px;
      font-weight: bold;
      color: var(--primary, #ff3d9a);
      letter-spacing: 3px;
    }
    .pack-question {
      font-size: 14px;
      color: var(--accent, #aaa);
      font-style: italic;
    }
    .pack-count {
      font-size: 12px;
      opacity: 0.5;
      margin-left: auto;
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
    }
    @media (max-width: 900px) {
      .card-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 600px) {
      .card-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .card {
      background: #1a1a2e;
      border: 1px solid var(--primary, #444);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      gap: 8px;
    }
    .card:hover { border-color: var(--accent, #ff3d9a); }
    .card-img-wrap {
      width: 100%;
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0d0d1a;
      overflow: hidden;
    }
    .card-img-wrap img {
      width: 80%;
      height: 80%;
      object-fit: contain;
    }
    .card-label {
      font-size: 11px;
      text-align: center;
      color: #ccc;
      letter-spacing: 1px;
      line-height: 1.3;
    }
  `]
})
export class PacksPreviewComponent implements OnInit {
  protected packs   = signal<PackDto[]>([]);
  protected loading = signal(true);
  protected error   = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const res = await fetch('/api/packs');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.packs.set(await res.json());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error cargando packs');
    } finally {
      this.loading.set(false);
    }
  }

  protected onImgError(e: Event): void {
    const img = e.target as HTMLImageElement;
    img.style.opacity = '0.2';
  }
}
