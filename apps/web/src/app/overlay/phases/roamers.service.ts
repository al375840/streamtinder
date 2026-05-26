import { Injectable } from '@angular/core';
import { renderSprite, spriteFor } from '../../ui/sprite/sprite.engine';

/* ============================================================
   STREAMER TINDER — Roamers (avatares deambulando sobre la carta)
   See spec at docs/design-handoff/prototypes/spec-roaming-avatars.html
   Single full-stage canvas; one rAF loop drives all roamers.
   ============================================================ */

type VoteKind = 'undecided' | 'no' | 'yes';

interface RoamerState {
  nick: string;
  vote: VoteKind;
  x: number;
  y: number;
  nextHopAt: number;
  /** Pre-rendered 24x30 sprite (cached on spawn). */
  sprite: HTMLCanvasElement;
}

const SPRITE_W = 24;
const SPRITE_H = 30;
const DRAW_W = 48;   // sprites render at 2x in the overlay
const DRAW_H = 60;
const NICK_PAD = 14; // space below sprite for the nick label
const MIN_Y = 12;

// Zones: 35% / 30% / 35% of the 1280 stage width.
const ZONES: Record<VoteKind, { minX: number; maxX: number }> = {
  no:        { minX: 8,    maxX: 448 },
  undecided: { minX: 448,  maxX: 832 },
  yes:       { minX: 832,  maxX: 1272 },
};

function randInt(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

@Injectable({ providedIn: 'root' })
export class RoamersService {
  private roamers = new Map<string, RoamerState>();
  private rafId: number | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stageW = 1280;
  private stageH = 616;
  private lastCardIndex = -1;

  start(canvas: HTMLCanvasElement, stageW: number, stageH: number): void {
    this.stop();
    this.stageW = stageW;
    this.stageH = stageH;
    canvas.width = stageW;
    canvas.height = stageH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.lastCardIndex = -1;
    this.loop();
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.ctx = null;
    this.roamers.clear();
  }

  /**
   * Reconcile the roamer set with the current game state.
   * - Adds spawns for new lobby players
   * - Removes roamers whose nicks left the lobby
   * - Triggers migration when a vote arrives (first-vote-wins, ignores subsequent)
   * - Resets all votes to 'undecided' when the cardIndex changes
   */
  sync(opts: { nicks: string[]; votes: Record<string, 'left' | 'right'>; cardIndex: number }): void {
    if (!this.ctx) return;

    // 1. Card change → reset everyone to undecided, they re-migrate back to center.
    if (opts.cardIndex !== this.lastCardIndex) {
      for (const r of this.roamers.values()) {
        r.vote = 'undecided';
        r.nextHopAt = performance.now();
      }
      this.lastCardIndex = opts.cardIndex;
    }

    // 2. Despawn anyone who left the lobby.
    const incoming = new Set(opts.nicks);
    for (const k of this.roamers.keys()) {
      if (!incoming.has(k)) this.roamers.delete(k);
    }

    // 3. Spawn new players.
    for (const nick of opts.nicks) {
      if (!this.roamers.has(nick)) this.roamers.set(nick, this.spawn(nick));
    }

    // 4. Apply votes (only the first one per player counts, per game rules).
    for (const [nick, direction] of Object.entries(opts.votes)) {
      const r = this.roamers.get(nick);
      if (!r || r.vote !== 'undecided') continue;
      r.vote = direction === 'left' ? 'no' : 'yes';
      r.nextHopAt = performance.now(); // start migrating immediately
    }
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private spawn(nick: string): RoamerState {
    const sprite = document.createElement('canvas');
    sprite.width = SPRITE_W;
    sprite.height = SPRITE_H;
    const sctx = sprite.getContext('2d')!;
    renderSprite(sctx, spriteFor(nick));

    const z = ZONES.undecided;
    return {
      nick,
      vote: 'undecided',
      x: z.minX + Math.random() * (z.maxX - z.minX - DRAW_W),
      y: MIN_Y + Math.random() * (this.stageH - DRAW_H - NICK_PAD - MIN_Y),
      nextHopAt: performance.now() + Math.random() * 300,
      sprite,
    };
  }

  private loop = (): void => {
    if (!this.ctx) return;
    this.tick(performance.now());
    this.rafId = requestAnimationFrame(this.loop);
  };

  private tick(now: number): void {
    const ctx = this.ctx!;
    ctx.clearRect(0, 0, this.stageW, this.stageH);
    for (const r of this.roamers.values()) {
      if (now >= r.nextHopAt) this.hop(r, now);
      this.draw(ctx, r);
    }
  }

  private hop(r: RoamerState, now: number): void {
    const z = ZONES[r.vote];
    const outOfZone = r.x < z.minX || r.x > z.maxX - DRAW_W;

    if (outOfZone) {
      // Migration: bigger horizontal step, faster cadence.
      const targetCenter = (z.minX + z.maxX) / 2;
      r.x += Math.sign(targetCenter - r.x) * 6;
      r.y += randInt(-2, 2);
      r.y = clamp(r.y, MIN_Y, this.stageH - DRAW_H - NICK_PAD);
      r.nextHopAt = now + 80;
    } else {
      // Inside zone: erratic jitter, slower cadence.
      r.x = clamp(r.x + randInt(-4, 4), z.minX, z.maxX - DRAW_W);
      r.y = clamp(r.y + randInt(-3, 3), MIN_Y, this.stageH - DRAW_H - NICK_PAD);
      r.nextHopAt = now + 150 + Math.random() * 200;
    }
  }

  private draw(ctx: CanvasRenderingContext2D, r: RoamerState): void {
    // Sprite, scaled 2x with nearest-neighbor (canvas-wide setting in start()).
    ctx.drawImage(r.sprite, r.x, r.y, DRAW_W, DRAW_H);

    // Nick label, outlined for legibility over any background.
    const cx = r.x + DRAW_W / 2;
    const ny = r.y + DRAW_H + 10;
    const txt = '@' + (r.nick.length > 12 ? r.nick.slice(0, 12) : r.nick);
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0a0612';
    // 8-direction outline (cheap, looks crispy)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        ctx.fillText(txt, cx + dx, ny + dy);
      }
    }
    ctx.fillStyle = '#f6f0ff';
    ctx.fillText(txt, cx, ny);

    // Vote tag — small badge over the top-right of the sprite.
    if (r.vote !== 'undecided') {
      const color = r.vote === 'no' ? '#ff5b5b' : '#5fde6f';
      const label = r.vote === 'no' ? '!izq' : '!der';
      const tagW = 28;
      const tagH = 12;
      const tagX = r.x + DRAW_W - tagW + 6;
      const tagY = r.y - 4;
      ctx.fillStyle = '#0a0612';
      ctx.fillRect(tagX, tagY, tagW, tagH);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(tagX, tagY, tagW, tagH);
      ctx.fillStyle = color;
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText(label, tagX + tagW / 2, tagY + tagH - 3);
    }
  }
}
