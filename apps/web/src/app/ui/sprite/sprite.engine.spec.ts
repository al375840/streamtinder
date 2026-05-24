import { hashNick, spriteFor, BODY_COLORS, renderSprite } from './sprite.engine';

describe('hashNick', () => {
  it('is deterministic and case-insensitive', () => {
    expect(hashNick('Adri')).toBe(hashNick('adri'));
    expect(hashNick('ADRI')).toBe(hashNick('adri'));
  });

  it('returns same hash on repeated calls', () => {
    expect(hashNick('lara99')).toBe(hashNick('lara99'));
  });

  it('produces unsigned 32-bit number', () => {
    const h = hashNick('verylongnickname1234');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it('empty string does not crash', () => {
    expect(() => hashNick('')).not.toThrow();
  });

  it('null-like input does not crash', () => {
    expect(() => hashNick(undefined as unknown as string)).not.toThrow();
  });
});

describe('spriteFor', () => {
  it('returns same sprite for same nick', () => {
    expect(spriteFor('adri')).toEqual(spriteFor('adri'));
  });

  it('is case-insensitive', () => {
    expect(spriteFor('Adri')).toEqual(spriteFor('adri'));
    expect(spriteFor('ADRI')).toEqual(spriteFor('adri'));
  });

  it('uses pack palette when provided', () => {
    const palette = ['#000000', '#111111'];
    const s = spriteFor('adri', palette);
    expect(palette).toContain(s.body);
  });

  it('falls back to BODY_COLORS without palette', () => {
    const s = spriteFor('adri');
    expect(BODY_COLORS).toContain(s.body);
  });

  it('exposes the hash on the spec', () => {
    const s = spriteFor('adri');
    expect(s.hash).toBe(hashNick('adri'));
  });

  it('hasHat is a boolean', () => {
    const s = spriteFor('adri');
    expect(typeof s.hasHat).toBe('boolean');
  });
});

describe('renderSprite', () => {
  it('does not throw rendering a sprite', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) { pending('Canvas not available in test environment'); return; }
    expect(() => renderSprite(ctx, spriteFor('adri'))).not.toThrow();
  });

  it('produces non-empty canvas data', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) { pending('Canvas not available in test environment'); return; }
    renderSprite(ctx, spriteFor('adri'));
    const data = ctx.getImageData(0, 0, 24, 30).data;
    let nonTransparent = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) nonTransparent++;
    }
    expect(nonTransparent).toBeGreaterThan(50);
  });

  it('renders all poses without throwing', () => {
    const poses = ['idle', 'arms_up', 'wave', 'cheer', 'point', 'hands_hips'] as const;
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) { pending('Canvas not available in test environment'); return; }
    for (const pose of poses) {
      expect(() => renderSprite(ctx, spriteFor('adri'), { pose })).not.toThrow();
    }
  });

  it('renders all states without throwing', () => {
    const states = ['normal', 'voted', 'eliminated', 'winner'] as const;
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    if (!ctx) { pending('Canvas not available in test environment'); return; }
    for (const state of states) {
      expect(() => renderSprite(ctx, spriteFor('adri'), { state })).not.toThrow();
    }
  });
});
