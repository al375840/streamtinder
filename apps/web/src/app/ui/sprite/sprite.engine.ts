/* ============================================================
   STREAMER TINDER — sprite engine (TypeScript port)
   Port of docs/design-handoff/prototypes/assets/sprite.js
   MANTENER algoritmo idéntico — cualquier desviación rompe "mismo nick = mismo sprite"
   ============================================================ */

// ---- PALETTES (kept in sync with tokens.css) -------------
export const BODY_COLORS = [
  '#ff3c8b', '#4ad4d4', '#5fde6f', '#ffd33d',
  '#c97aff', '#ff8a3d', '#6a8aff', '#ffffff'
];
export const SKIN_COLORS = ['#ffd5b0', '#e8a878', '#a06a3a', '#5a3a1f'];
export const HAIR_COLORS = ['#2a1810', '#6b3a1a', '#d4a23d', '#b8341f', '#4a4a6a', '#ff3c8b'];
export const PANTS_COLORS = ['#3a2a5a', '#1f3a5a', '#5a3a1f', '#2a2a2a'];
export const POSES = ['idle', 'arms_up', 'wave', 'cheer', 'point', 'hands_hips'] as const;

export type Pose = typeof POSES[number];
export type SpriteState = 'normal' | 'voted' | 'eliminated' | 'winner';

export interface SpriteSpec {
  body: string;
  skin: string;
  hair: string;
  pants: string;
  pose: Pose;
  hasHat: boolean;
  hash: number;
}

// ---- Hash (djb2) -----------------------------------------
// CRÍTICO: usar >>> (unsigned shift) igual que el original JS
export function hashNick(nick: string): number {
  let h = 5381 >>> 0;
  const s = String(nick ?? '').toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ---- Sprite spec for a nick ------------------------------
export function spriteFor(nick: string, packPalette?: string[]): SpriteSpec {
  const h = hashNick(nick);
  const palette = packPalette ?? BODY_COLORS;
  return {
    body:   palette[h % palette.length],
    skin:   SKIN_COLORS[(h >>> 3) % SKIN_COLORS.length],
    hair:   HAIR_COLORS[(h >>> 6) % HAIR_COLORS.length],
    pants:  PANTS_COLORS[(h >>> 9) % PANTS_COLORS.length],
    pose:   POSES[(h >>> 12) % POSES.length],
    hasHat: ((h >>> 15) & 1) === 1,
    hash:   h
  };
}

// ---- Darken helper (auto-shadow) -------------------------
export function darken(hex: string, amt: number): string {
  const v = parseInt(hex.slice(1), 16);
  let r = (v >> 16) & 0xff, g = (v >> 8) & 0xff, b = v & 0xff;
  r = Math.max(0, r - amt);
  g = Math.max(0, g - amt);
  b = Math.max(0, b - amt);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function lighten(hex: string, amt: number): string {
  const v = parseInt(hex.slice(1), 16);
  let r = (v >> 16) & 0xff, g = (v >> 8) & 0xff, b = v & 0xff;
  r = Math.min(255, r + amt);
  g = Math.min(255, g + amt);
  b = Math.min(255, b + amt);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ---- Pixel-buffer renderer (24x30) -----------------------
// We build a 24*30 indexed array, then paint it.
export function makePoseBuffer(spec: SpriteSpec, pose: Pose): { buf: (string | null)[]; W: number; H: number } {
  const W = 24, H = 30;
  const buf: (string | null)[] = new Array(W * H).fill(null);

  const skin    = spec.skin;
  const skinDk  = darken(spec.skin, 40);
  const hair    = spec.hair;
  const hairDk  = darken(spec.hair, 40);
  const body    = spec.body;
  const bodyDk  = darken(spec.body, 60);
  const bodyLt  = lighten(spec.body, 50);
  const pants   = spec.pants;
  const pantsDk = darken(spec.pants, 40);
  const ink     = '#0a0612';
  const mouth   = '#3a1020';

  function put(x: number, y: number, c: string): void {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    buf[y * W + x] = c;
  }
  function rect(x: number, y: number, w: number, h: number, c: string): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) put(x + i, y + j, c);
    }
  }

  // === HEAD (8x8 at 8,2) ===
  rect(8, 2, 8, 8, skin);
  // hair top
  rect(8, 2, 8, 3, hair);
  // hair sides
  put(8, 5, hair);  put(15, 5, hair);
  // hair highlight
  rect(10, 2, 4, 1, hairDk);
  put(11, 3, lighten(hair, 30));
  // eyes
  put(10, 6, ink); put(13, 6, ink);
  put(10, 5, '#ffffff'); put(13, 5, '#ffffff');   // sclera highlight
  put(10, 6, ink); put(13, 6, ink);
  // mouth (pose-dependent)
  if (pose === 'cheer' || pose === 'arms_up' || pose === 'wave') {
    // open smile
    rect(10, 8, 4, 1, mouth);
    put(10, 7, mouth); put(13, 7, mouth);
  } else if (pose === 'hands_hips' || pose === 'point') {
    // smirk
    rect(10, 8, 3, 1, mouth);
  } else {
    // neutral smile
    rect(10, 8, 4, 1, mouth);
  }

  // chin shadow
  rect(8, 9, 8, 1, skinDk);

  // hat?
  if (spec.hasHat) {
    rect(7, 1, 10, 2, bodyDk);
    rect(8, 0, 8, 2, body);
  }

  // === BODY (12x12 at 6,10) ===
  rect(6, 10, 12, 12, body);
  // body shadow row
  rect(6, 18, 12, 1, bodyDk);
  rect(6, 21, 12, 1, bodyDk);
  // body highlights — diagonal dither
  put(8, 12, bodyLt);  put(13, 12, bodyLt);
  put(7, 14, bodyLt);  put(14, 14, bodyLt);
  // collar
  rect(10, 10, 4, 1, bodyDk);

  // === PANTS (10x6 at 7,22) ===
  rect(7, 22, 10, 6, pants);
  // pants split
  rect(11, 22, 2, 6, pantsDk);
  // shoes
  rect(7, 28, 4, 2, ink);
  rect(13, 28, 4, 2, ink);

  // === ARMS — pose-dependent =========================
  function armDown(side: number): void {
    // side: -1 left, +1 right
    const armX = side < 0 ? 4 : 18;
    const handY = 20;
    rect(armX, 12, 2, 8, body);
    rect(armX, 18, 2, 1, bodyDk);
    rect(armX, handY, 2, 2, skin);
  }
  function armUp(side: number): void {
    const armX = side < 0 ? 5 : 17;
    rect(armX, 4, 2, 10, body);
    rect(armX, 12, 2, 1, bodyDk);
    rect(armX, 2, 2, 2, skin);
  }
  function armSide(side: number): void {
    // arm out horizontal
    const startX = side < 0 ? 2 : 16;
    rect(startX, 13, 6, 2, body);
    rect(startX, 14, 6, 1, bodyDk);
    const handX = side < 0 ? 2 : 20;
    rect(handX, 13, 2, 2, skin);
  }
  function armHip(side: number): void {
    const armX = side < 0 ? 4 : 18;
    rect(armX, 12, 2, 4, body);
    // bend
    if (side < 0) {
      rect(5, 16, 3, 2, body);
      rect(7, 16, 2, 2, skin);
    } else {
      rect(16, 16, 3, 2, body);
      rect(15, 16, 2, 2, skin);
    }
  }

  switch (pose) {
    case 'idle':       armDown(-1); armDown(+1); break;
    case 'arms_up':    armUp(-1);   armUp(+1);   break;
    case 'wave':       armDown(-1); armUp(+1);   break;
    case 'cheer':      armUp(-1);   armUp(+1);
                       // sparkles already absent — done in overlay layer
                       break;
    case 'point':      armDown(-1); armSide(+1); break;
    case 'hands_hips': armHip(-1);  armHip(+1);  break;
    default:           armDown(-1); armDown(+1);
  }

  return { buf, W, H };
}

// ---- Outline pass: any non-empty pixel whose neighbor is empty gets an ink halo
export function withOutline(buf: (string | null)[], W: number, H: number): (string | null)[] {
  const out = buf.slice();
  const ink = '#0a0612';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (buf[y * W + x] != null) continue;
      // check 4 neighbors
      const up    = y > 0   ? buf[(y - 1) * W + x] : null;
      const down  = y < H-1 ? buf[(y + 1) * W + x] : null;
      const left  = x > 0   ? buf[y * W + (x - 1)] : null;
      const right = x < W-1 ? buf[y * W + (x + 1)] : null;
      if (up || down || left || right) out[y * W + x] = ink;
    }
  }
  return out;
}

// ---- Paint buffer onto a canvas ctx at native scale (1px=1px)
export function paintBuffer(ctx: CanvasRenderingContext2D, ox: number, oy: number, buf: (string | null)[], W: number, H: number): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = buf[y * W + x];
      if (c) { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); }
    }
  }
}

// ---- High-level: render sprite onto a canvas ctx ------
// Equivalent to renderToCanvas in the original JS, but takes ctx + spec directly.
// The canvas backing buffer should be 24x30 and let CSS scale via image-rendering: pixelated.
export function renderSprite(ctx: CanvasRenderingContext2D, spec: SpriteSpec, opts?: { pose?: Pose; state?: SpriteState }): void {
  const pose = opts?.pose ?? spec.pose ?? 'idle';
  const state = opts?.state ?? 'normal';
  const W = 24, H = 30;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  let { buf } = makePoseBuffer(spec, pose);
  buf = withOutline(buf, W, H);

  paintBuffer(ctx, 0, 0, buf, W, H);

  // State overlays
  if (state === 'voted') {
    // Yellow halo ring around outside — additional pixels
    const ring = '#ffd33d';
    ctx.fillStyle = ring;
    // top/bottom edges
    for (let x = 6; x < 18; x++) { if (!buf[1 * W + x]) ctx.fillRect(x, 1, 1, 1); }
    // simple corner sparkles
    ctx.fillRect(2, 4, 1, 1);
    ctx.fillRect(3, 3, 1, 1);
    ctx.fillRect(20, 4, 1, 1);
    ctx.fillRect(21, 3, 1, 1);
    ctx.fillRect(1, 14, 1, 1);
    ctx.fillRect(22, 14, 1, 1);
  } else if (state === 'eliminated') {
    // grey wash — replace body colors with greyscale
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const avg = (d[i] * 0.3 + d[i + 1] * 0.5 + d[i + 2] * 0.2) | 0;
      const dim = Math.max(0, avg - 30);
      d[i] = dim; d[i + 1] = dim; d[i + 2] = dim;
    }
    ctx.putImageData(img, 0, 0);
  } else if (state === 'winner') {
    // gold sparkles
    ctx.fillStyle = '#ffd33d';
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(3, 1, 1, 1);
    ctx.fillRect(20, 2, 1, 1);
    ctx.fillRect(21, 1, 1, 1);
    ctx.fillRect(1, 10, 1, 1);
    ctx.fillRect(22, 12, 1, 1);
    ctx.fillRect(0, 16, 1, 1);
    ctx.fillRect(23, 18, 1, 1);
  }
}

// ---- High-level: render to canvas element (compat with original renderToCanvas) ------
export function renderToCanvas(canvas: HTMLCanvasElement, nick: string | SpriteSpec, opts?: { packPalette?: string[]; pose?: Pose; state?: SpriteState }): SpriteSpec {
  const spec: SpriteSpec = typeof nick === 'string' ? spriteFor(nick, opts?.packPalette) : nick;
  const W = 24, H = 30;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  renderSprite(ctx, spec, opts);
  return spec;
}
