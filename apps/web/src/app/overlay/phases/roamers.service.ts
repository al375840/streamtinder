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
const MIN_Y = 12;

/** Total vertical footprint of the nick pill (background + text + padding + border).
 *  Used to compute how far down a roamer can go before its label overlaps things. */
const NICK_PILL_H = 16;

/** Maximum number of avatars rendered on screen simultaneously.
 *  When the lobby has more than this, a random subset is shown. The remainder
 *  still vote and count in the tally — they're just not visualised. */
const MAX_VISIBLE = 20;

// ── Card footer exclusion ──────────────────────────────────────────────────
// The card sits centered on the 1280x616 stage at width 420, max-height 540.
// Its bottom 80-100px hold the card-name + card-subtitle text. We forbid the
// roamers from landing where their nick label would overlap that text.
const CARD_X_MIN = 410;   // a bit wider than the card's actual 430 to give breathing room
const CARD_X_MAX = 870;
const CARD_FOOTER_TOP_Y = 478;

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
   * - Adds spawns for new lobby players (up to MAX_VISIBLE total)
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

    // 3. Fill open slots up to MAX_VISIBLE with a random sample of the lobby.
    //    Once chosen, a roamer sticks around until they leave the lobby — we don't
    //    re-shuffle on every state update (that would cause chaotic respawning).
    const slotsLeft = MAX_VISIBLE - this.roamers.size;
    if (slotsLeft > 0) {
      const candidates = opts.nicks.filter(n => !this.roamers.has(n));
      // Partial Fisher-Yates: only need to shuffle the first `slotsLeft` items.
      const take = Math.min(slotsLeft, candidates.length);
      for (let i = 0; i < take; i++) {
        const j = i + Math.floor(Math.random() * (candidates.length - i));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        this.roamers.set(candidates[i], this.spawn(candidates[i]));
      }
    }

    // 4. Apply votes (only the first one per player counts, per game rules).
    //    Note: votes from non-shown nicks are silently ignored here — their tally
    //    is shown by the big NO/SÍ counters, this layer is just a visual sample.
    for (const [nick, direction] of Object.entries(opts.votes)) {
      const r = this.roamers.get(nick);
      if (!r || r.vote !== 'undecided') continue;
      r.vote = direction === 'left' ? 'no' : 'yes';
      r.nextHopAt = performance.now(); // start migrating immediately
    }
  }

  // ── internals ─────────────────────────────────────────────────────────────

  /** Maximum Y for a roamer's top-left, given its X. Inside the card's
   *  horizontal range the limit is higher up (so the nick label stays clear
   *  of the card-name/subtitle text); outside, it can go almost to the floor. */
  private maxYAt(x: number): number {
    const right = x + DRAW_W;
    const overCardFooter = right >= CARD_X_MIN && x <= CARD_X_MAX;
    if (overCardFooter) {
      return CARD_FOOTER_TOP_Y - DRAW_H - NICK_PILL_H - 4;
    }
    return this.stageH - DRAW_H - NICK_PILL_H - 8;
  }

  private spawn(nick: string): RoamerState {
    const sprite = document.createElement('canvas');
    sprite.width = SPRITE_W;
    sprite.height = SPRITE_H;
    const sctx = sprite.getContext('2d')!;
    renderSprite(sctx, spriteFor(nick));

    const z = ZONES.undecided;
    const x = z.minX + Math.random() * (z.maxX - z.minX - DRAW_W);
    return {
      nick,
      vote: 'undecided',
      x,
      y: MIN_Y + Math.random() * (this.maxYAt(x) - MIN_Y),
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
      r.nextHopAt = now + 80;
    } else {
      // Inside zone: erratic jitter, slower cadence.
      r.x = clamp(r.x + randInt(-4, 4), z.minX, z.maxX - DRAW_W);
      r.y += randInt(-3, 3);
      r.nextHopAt = now + 150 + Math.random() * 200;
    }
    // Always clamp Y to the *current* X's allowed range. This is what pulls
    // roamers back up when they migrate into the card's horizontal range —
    // the maxY drops, the clamp pushes them out of the footer area.
    r.y = clamp(r.y, MIN_Y, this.maxYAt(r.x));
  }

  private draw(ctx: CanvasRenderingContext2D, r: RoamerState): void {
    // Sprite, scaled 2x with nearest-neighbor (set canvas-wide in start()).
    ctx.drawImage(r.sprite, r.x, r.y, DRAW_W, DRAW_H);

    // Nick label — drawn as a tight dark pill with light text. Way more readable
    // than the previous text-shadow outline approach, which got drowned out
    // against busy card art.
    const nickText = '@' + (r.nick.length > 12 ? r.nick.slice(0, 12) : r.nick);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textW = Math.ceil(ctx.measureText(nickText).width);
    const pillW = textW + 8;
    const pillH = NICK_PILL_H;
    const cx = r.x + DRAW_W / 2;
    const pillX = Math.round(cx - pillW / 2);
    const pillY = Math.round(r.y + DRAW_H + 2);

    // Background (void)
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(pillX, pillY, pillW, pillH);
    // 1px outline in stone — gives the pill definition without competing
    // with the bright text inside.
    ctx.fillStyle = '#3a2a5a';
    ctx.fillRect(pillX - 1, pillY, 1, pillH);
    ctx.fillRect(pillX + pillW, pillY, 1, pillH);
    ctx.fillRect(pillX, pillY - 1, pillW, 1);
    ctx.fillRect(pillX, pillY + pillH, pillW, 1);
    // Text
    ctx.fillStyle = '#f6f0ff';
    ctx.fillText(nickText, cx, pillY + pillH / 2 + 1);

    // Vote tag — small badge at the top-right of the sprite.
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
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(label, tagX + tagW / 2, tagY + tagH - 3);
    }
  }
}
