/* ============================================================
   STREAMER TINDER — ExtendingTimer
   Frontend-only utility: turns a server-side "endsAt" timestamp
   into a countdown that NEVER reaches 0:00. When it would hit 0
   it auto-extends by N seconds and emits a transient badge so the
   UI can show a "+Ns" animation.

   The server-side timers (CardTimerEndsAt, LobbyCountdownEndsAt)
   are purely cosmetic in this game — phases only advance when the
   streamer explicitly closes the card or starts the lobby. So
   extending visually is a pure UX nicety with no game-rule impact.
   ============================================================ */

export interface TimerBadge {
  /** Stable id — use as @for track key so each badge gets its own animation lifecycle. */
  id: number;
  /** Seconds added in this extension (display: "+{secs}s"). */
  secs: number;
  /** performance.now() at creation. Used to expire badges after the animation runs. */
  createdAt: number;
}

export interface TimerTick {
  display: string;
  urgent: boolean;
  /** Currently-visible "+Ns" badges. Render each with the same enter animation. */
  badges: TimerBadge[];
}

export interface ExtendingTimerOptions {
  /** When this value changes between ticks, the accumulated extension resets to 0.
   *  Typical use: pass `() => state.cardIndex` so each new card starts fresh. */
  resetKey?: () => unknown;
  /** Seconds to add each time the visible counter would hit 0. Default: 3. */
  extendBy?: number;
  /** Show timer as urgent when display seconds ≤ this. Default: 3. */
  urgentBelow?: number;
  /** Milliseconds a badge stays in the active list. Should be ≥ the CSS animation
   *  duration so the badge plays its full exit before being removed from the DOM. */
  badgeTtlMs?: number;
}

const DEFAULT_EXTEND_BY = 3;
const DEFAULT_URGENT_BELOW = 3;
const DEFAULT_BADGE_TTL = 1400;

export class ExtendingTimer {
  private extensionMs = 0;
  private nextBadgeId = 0;
  private lastResetKey: unknown = null;
  private badges: TimerBadge[] = [];

  constructor(private opts: ExtendingTimerOptions = {}) {}

  /**
   * Compute the current display state. Call this on a ~1s interval (matching
   * how often the counter visually changes). Cheap — no allocations on the hot
   * path except when a badge is added/expired.
   */
  tick(endsAtIso: string | undefined | null): TimerTick {
    const now = Date.now();

    // Expire badges that have outlived their TTL.
    const ttl = this.opts.badgeTtlMs ?? DEFAULT_BADGE_TTL;
    if (this.badges.length && this.badges.some(b => now - b.createdAt >= ttl)) {
      this.badges = this.badges.filter(b => now - b.createdAt < ttl);
    }

    if (!endsAtIso) {
      return { display: '--:--', urgent: false, badges: this.badges };
    }

    // Reset accumulated extension when the caller's "round" changes
    // (e.g., the cardIndex bumped — new card, fresh countdown).
    const key = this.opts.resetKey?.();
    if (key !== this.lastResetKey) {
      this.lastResetKey = key;
      this.extensionMs = 0;
    }

    const extendBy = this.opts.extendBy ?? DEFAULT_EXTEND_BY;
    const urgentBelow = this.opts.urgentBelow ?? DEFAULT_URGENT_BELOW;

    const effectiveEnd = new Date(endsAtIso).getTime() + this.extensionMs;
    let secs = Math.max(0, Math.ceil((effectiveEnd - now) / 1000));

    if (secs === 0) {
      // Auto-extend: bump the accumulated offset, emit a badge, and recompute.
      this.extensionMs += extendBy * 1000;
      this.nextBadgeId += 1;
      this.badges = [...this.badges, {
        id: this.nextBadgeId,
        secs: extendBy,
        createdAt: now,
      }];
      secs = extendBy;
    }

    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return {
      display: `${m}:${String(s).padStart(2, '0')}`,
      urgent: secs <= urgentBelow,
      badges: this.badges,
    };
  }
}
