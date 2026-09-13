/* ==========================================================================
   LOGO LAB — script.js  (schema v2)

   ARCHITECTURE
   ------------
   Everything is derived from one plain object, `state`. On any change,
   buildSVG(state) produces ONE string and stores it in `currentSVG`. That
   single string is injected into all five preview frames and is the exact
   byte content of the exported .svg file. No second render path exists.

   PURITY CONSTRAINTS (enforced, and covered by the browser test suite)
   --------------------------------------------------------------------
   - No `id` attributes anywhere in the artwork. Five inline copies of one id
     on a page collide; the browser resolves them all to the first copy.
   - Therefore no gradients, filters, clip-paths or masks in the SVG sense.
     Gradients are BANDED: N flat-filled shapes with interpolated colours,
     derived from each shape's own cross-section. See §5.
   - No XML declaration, so the identical string works for both innerHTML
     injection and the written file.
   - No dominant-baseline. Vertical text position is an explicit offset.
   - All text passes through escapeXml() once, in normalizeState().
   - Deterministic: identical state always yields an identical string.
     Randomisation is seeded (§3), never Math.random() at render time.

   SECTIONS
   --------
   §1  CONSTANTS         fonts, palettes, styles, control maps
   §2  STATE             defaults, ranges, sanitise/migrate
   §3  UTILITIES         escaping, numbers, seeded PRNG, colour maths
   §4  SVG PRIMITIVES    shape and text builders
   §5  GRADIENT BANDING  ID-free gradient synthesis
   §6  STYLE RENDERERS   one per style, frame-relative so they nest
   §7  SVG ASSEMBLY      normalizeState + buildSVG
   §8  PREVIEW           one string into every frame
   §9  HISTORY           undo / redo
   §10 CONTROLS          DOM wiring
   §11 TEXT MEASUREMENT  overflow warning + Fit text
   §12 EXPORT            SVG, PNG, brand kit (.zip)
   §13 GALLERY + BACKUP  localStorage, search, JSON import/export
   §14 THEME             app light/dark/system
   §15 INIT
   ========================================================================== */

(function () {
  'use strict';

  /* ======================================================================
     §1  CONSTANTS
     ====================================================================== */

  var SCHEMA_VERSION = 2;
  var STORAGE_KEY = 'logoLab.gallery.v1';   // unchanged: v1 records still load
  var THEME_KEY = 'logoLab.theme';

  /* Cross-platform stacks only. SVG references font NAMES, not font data. */
  var FONT_STACKS = [
    { id: 'grotesque', label: 'Modern sans (system)',  stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
    { id: 'geometric', label: 'Geometric sans',        stack: "'Century Gothic', 'Avant Garde', 'Trebuchet MS', Verdana, Geneva, sans-serif" },
    { id: 'humanist',  label: 'Rounded sans',          stack: "'Trebuchet MS', 'Segoe UI', Tahoma, Verdana, sans-serif" },
    { id: 'neutral',   label: 'Neutral sans',          stack: "Helvetica, 'Helvetica Neue', Arial, 'Liberation Sans', sans-serif" },
    { id: 'condensed', label: 'Condensed sans',        stack: "'Arial Narrow', 'Liberation Sans Narrow', 'Helvetica Neue', Arial, sans-serif" },
    { id: 'serif',     label: 'Classic serif',         stack: "Georgia, 'Times New Roman', Times, serif" },
    { id: 'elegant',   label: 'Elegant serif',         stack: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" },
    { id: 'slab',      label: 'Slab serif',            stack: "Rockwell, 'Roboto Slab', 'Courier New', Georgia, serif" },
    { id: 'mono',      label: 'Monospace / technical', stack: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', 'Courier New', monospace" },
    { id: 'display',   label: 'Heavy display',         stack: "Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif" }
  ];

  /* Presets write into the four colour slots. The preset id is NOT stored,
     so a saved concept can never disagree with its own colours. */
  var PALETTES = [
    { name: 'Ink',        primary: '#1b1f3b', secondary: '#4f5bd5', accent: '#f2b705', background: '#ffffff' },
    { name: 'Terminal',   primary: '#0f1a14', secondary: '#1f7a4d', accent: '#8ef2b0', background: '#f3f7f4' },
    { name: 'Ember',      primary: '#2b1410', secondary: '#c8442a', accent: '#f6a623', background: '#fdf6ef' },
    { name: 'Paper',      primary: '#2e2a25', secondary: '#8a7f6d', accent: '#b4442f', background: '#f7f3ea' },
    { name: 'Signal',     primary: '#101114', secondary: '#3b82f6', accent: '#f43f5e', background: '#ffffff' },
    { name: 'Deep space', primary: '#12122b', secondary: '#6d5bd0', accent: '#22d3ee', background: '#0e0e1c' },
    { name: 'Studio',     primary: '#232323', secondary: '#6b6b6b', accent: '#d9d9d9', background: '#ffffff' }
  ];

  var HARMONY_SCHEMES = [
    { id: 'complementary', label: 'Complementary' },
    { id: 'analogous',     label: 'Analogous' },
    { id: 'triadic',       label: 'Triadic' },
    { id: 'split',         label: 'Split complementary' },
    { id: 'monochrome',    label: 'Monochromatic' }
  ];

  /* Canvas size and text field per style. Canvases are fixed — text never
     resizes the canvas, hence the overflow warning and manual Fit text. */
  var STYLES = {
    monogram: { label: 'Monogram',         w: 512,  h: 512, textKey: 'initials', mark: true },
    badge:    { label: 'Circular badge',   w: 512,  h: 512, textKey: 'initials', mark: true },
    symbol:   { label: 'Geometric symbol', w: 512,  h: 512, textKey: null,       mark: true },
    orbit:    { label: 'Orbit symbol',     w: 512,  h: 512, textKey: null,       mark: true },
    avatar:   { label: 'Geometric avatar', w: 512,  h: 512, textKey: null,       mark: true },
    wordmark: { label: 'Wordmark',         w: 1024, h: 320, textKey: 'logoText', mark: false },
    lockup:   { label: 'Lockup',           w: 1024, h: 420, textKey: 'logoText', mark: false }
  };

  /* Styles usable as the MARK inside a lockup: square, self-contained. */
  var MARK_STYLES = ['monogram', 'badge', 'symbol', 'orbit', 'avatar'];

  /* Which controls affect which style. Everything else is dimmed and
     labelled "not used", so no control ever appears to do nothing. */
  var SHARED_ALWAYS = ['renderMode', 'gradientEnabled', 'gradientTo',
                       'gradientBands', 'autoContrast'];

  var STYLE_CONTROLS = {
    monogram: ['fontFamily', 'fontSize', 'letterSpacing', 'iconSize', 'borderThickness', 'cornerRadius'],
    badge:    ['fontFamily', 'fontSize', 'letterSpacing', 'iconSize', 'borderThickness', 'badgeRingGap', 'badgeInnerRing'],
    symbol:   ['iconSize', 'borderThickness', 'cornerRadius', 'symbolSides', 'symbolRotation', 'symbolInnerScale'],
    orbit:    ['iconSize', 'borderThickness', 'orbitNodes', 'orbitSeed', 'orbitSpread', 'orbitDotScale', 'orbitSpokes'],
    avatar:   ['iconSize', 'borderThickness', 'cornerRadius',
               'avatarHeadWidth', 'avatarHeadHeight', 'avatarEyeSize',
               'avatarEyeSpacing', 'avatarEars', 'avatarMouth'],
    wordmark: ['fontFamily', 'fontSize', 'letterSpacing', 'borderThickness'],
    lockup:   ['fontFamily', 'fontSize', 'letterSpacing', 'iconSize', 'borderThickness',
               'cornerRadius', 'lockupMark', 'lockupArrangement', 'lockupGap',
               'taglineText', 'secondaryFontFamily', 'taglineFontSize', 'taglineLetterSpacing']
  };

  /* Distance from a text baseline to the visual centre of its capitals, as
     a fraction of font size. Used INSTEAD of dominant-baseline, which
     browsers and design programs disagree about. */
  var CAP_CENTRE_RATIO = 0.35;


  /* ======================================================================
     §2  STATE
     ====================================================================== */

  var DEFAULT_STATE = {
    schemaVersion: SCHEMA_VERSION,

    /* identity */
    creatorName: 'Your Name',
    initials: 'YN',
    logoText: 'Your Name',
    taglineText: 'writing · code · worlds',

    /* which renderer runs */
    style: 'monogram',

    /* colour */
    primaryColor: '#1b1f3b',
    secondaryColor: '#4f5bd5',
    accentColor: '#f2b705',
    backgroundColor: '#ffffff',
    transparentBackground: true,
    monochrome: false,

    /* v2: adaptive contrast. Off by default so concepts saved under v1
       restore byte-identically; the harmoniser and randomiser switch it on. */
    autoContrast: false,

    /* v2: render mode. 'outline' draws shapes as strokes instead of fills. */
    renderMode: 'solid',

    /* v2: banded gradient (see §5) */
    gradientEnabled: false,
    gradientTo: '#4f5bd5',
    gradientBands: 24,

    /* type */
    fontFamily: 'grotesque',
    secondaryFontFamily: 'mono',
    fontSize: 170,
    letterSpacing: 4,
    taglineFontSize: 34,
    taglineLetterSpacing: 6,

    /* shared geometry */
    iconSize: 74,
    borderThickness: 12,
    cornerRadius: 56,

    /* circular badge */
    badgeRingGap: 26,
    badgeInnerRing: true,

    /* geometric symbol */
    symbolSides: 6,
    symbolRotation: 0,
    symbolInnerScale: 48,

    /* v2: orbit symbol (seeded, deterministic) */
    orbitNodes: 6,
    orbitSeed: 137,
    orbitSpread: 62,
    orbitDotScale: 26,
    orbitSpokes: true,

    /* geometric avatar */
    avatarHeadWidth: 100,
    avatarHeadHeight: 100,
    avatarEyeSize: 11,
    avatarEyeSpacing: 44,
    avatarEars: 'antenna',
    avatarMouth: 'line',

    /* v2: lockup layout */
    lockupMark: 'monogram',
    lockupArrangement: 'horizontal',
    lockupGap: 60
  };

  var NUMERIC_RANGES = {
    fontSize:             [20, 300],
    letterSpacing:        [-20, 60],
    taglineFontSize:      [10, 120],
    taglineLetterSpacing: [-10, 40],
    iconSize:             [30, 98],
    borderThickness:      [0, 48],
    cornerRadius:         [0, 140],
    badgeRingGap:         [6, 70],
    symbolSides:          [3, 12],
    symbolRotation:       [0, 180],
    symbolInnerScale:     [0, 90],
    orbitNodes:           [3, 12],
    orbitSeed:            [0, 999],
    orbitSpread:          [20, 95],
    orbitDotScale:        [6, 60],
    avatarHeadWidth:      [50, 130],
    avatarHeadHeight:     [50, 130],
    avatarEyeSize:        [2, 30],
    avatarEyeSpacing:     [10, 80],
    gradientBands:        [4, 48],
    lockupGap:            [0, 200]
  };

  var ENUMS = {
    style: ['monogram', 'badge', 'symbol', 'orbit', 'avatar', 'wordmark', 'lockup'],
    avatarEars: ['none', 'ears', 'antenna'],
    avatarMouth: ['none', 'line', 'smile', 'dot'],
    renderMode: ['solid', 'outline'],
    lockupMark: MARK_STYLES,
    lockupArrangement: ['horizontal', 'stacked']
  };

  var state = cloneState(DEFAULT_STATE);
  var currentSVG = '';

  function cloneState(obj) { return JSON.parse(JSON.stringify(obj)); }

  /* Merge an untrusted object over the defaults. This is the migration
     path: a v1 concept simply lacks the v2 fields and keeps their defaults,
     which are chosen so v1 artwork reproduces unchanged. */
  function sanitiseState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    var out = cloneState(DEFAULT_STATE);
    var key;

    for (key in DEFAULT_STATE) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_STATE, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;

      var value = raw[key];
      var fallback = DEFAULT_STATE[key];

      if (typeof fallback === 'boolean') {
        out[key] = !!value;
      } else if (typeof fallback === 'number') {
        var num = Number(value);
        if (isFinite(num)) {
          var range = NUMERIC_RANGES[key];
          out[key] = range ? clamp(num, range[0], range[1]) : num;
        }
      } else if (ENUMS[key]) {
        if (ENUMS[key].indexOf(value) !== -1) out[key] = value;
      } else if (key === 'fontFamily' || key === 'secondaryFontFamily') {
        if (findFontStack(value)) out[key] = value;
      } else if (isColourKey(key)) {
        if (isHexColour(value)) out[key] = value;
      } else if (typeof value === 'string') {
        out[key] = value.slice(0, 120);
      }
    }

    out.schemaVersion = SCHEMA_VERSION;
    return out;
  }

  function isColourKey(key) {
    return key === 'primaryColor' || key === 'secondaryColor' ||
           key === 'accentColor'  || key === 'backgroundColor' ||
           key === 'gradientTo';
  }

  function isHexColour(v) {
    return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  }

  function findFontStack(id) {
    for (var i = 0; i < FONT_STACKS.length; i++) {
      if (FONT_STACKS[i].id === id) return FONT_STACKS[i];
    }
    return null;
  }


  /* ======================================================================
     §3  UTILITIES  (pure functions only)
     ====================================================================== */

  /* Central XML escaping, applied once in normalizeState so no renderer can
     forget it. An unescaped & or < produces a malformed file that renders
     as nothing — the most common way a generator like this fails. */
  function escapeXml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function n(v) {
    if (!isFinite(v)) return '0';
    return String(Math.round(v * 100) / 100);
  }

  function uid() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function slugify(text) {
    var slug = String(text || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
    return slug || 'my';
  }

  function formatTimestamp(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return 'Unknown date';
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function byId(id) { return document.getElementById(id); }

  /* --- Seeded pseudo-random number generator (mulberry32) ---------------
     Randomisation must be reproducible: the same seed must always rebuild
     the same concept, or a saved state would not describe its own artwork.
     Math.random() is never called during rendering. */
  function makeRandom(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --- Colour maths (all pure) ----------------------------------------- */

  function hexToRgb(hex) {
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function rgbToHex(r, g, b) {
    function part(v) {
      var s = Math.round(clamp(v, 0, 255)).toString(16);
      return s.length === 1 ? '0' + s : s;
    }
    return '#' + part(r) + part(g) + part(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    var d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = ((b - r) / d + 2);
      else                h = ((r - g) / d + 4);
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if      (h <  60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else              { r = c; b = x; }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }

  function hexToHsl(hex) { var c = hexToRgb(hex); return rgbToHsl(c.r, c.g, c.b); }

  function hslToHex(h, s, l) { var c = hslToRgb(h, s, l); return rgbToHex(c.r, c.g, c.b); }

  /* Linear interpolation between two hex colours. Done in sRGB space:
     perceptually imperfect, but it is what SVG's own gradients do, so a
     banded gradient matches what a real gradient would have looked like. */
  function mixHex(a, b, t) {
    var ca = hexToRgb(a), cb = hexToRgb(b);
    return rgbToHex(
      ca.r + (cb.r - ca.r) * t,
      ca.g + (cb.g - ca.g) * t,
      ca.b + (cb.b - ca.b) * t
    );
  }

  /* WCAG relative luminance, used for automatic contrast decisions. */
  function relativeLuminance(hex) {
    var c = hexToRgb(hex);
    function channel(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }

  function contrastRatio(a, b) {
    var la = relativeLuminance(a), lb = relativeLuminance(b);
    var hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }

  /* Picks whichever of two candidates reads better on `surface`. */
  function bestContrast(surface, candidates) {
    var best = candidates[0], bestRatio = -1;
    for (var i = 0; i < candidates.length; i++) {
      var ratio = contrastRatio(surface, candidates[i]);
      if (ratio > bestRatio) { bestRatio = ratio; best = candidates[i]; }
    }
    return best;
  }

  /* --- Colour harmoniser ------------------------------------------------
     Derives a four-slot palette from one base colour using classical hue
     relationships. Pure and deterministic. `dark` requests a dark-ground
     palette instead of a light one. */
  function harmonise(baseHex, scheme, dark) {
    var base = hexToHsl(baseHex);
    var h = base.h;
    var s = clamp(base.s < 0.15 ? 0.45 : base.s, 0.2, 0.95);

    var offsets;
    switch (scheme) {
      case 'complementary': offsets = [0, 180, 150]; break;
      case 'analogous':     offsets = [0, 30, -30];  break;
      case 'triadic':       offsets = [0, 120, 240]; break;
      case 'split':         offsets = [0, 150, 210]; break;
      case 'monochrome':    offsets = [0, 0, 0];     break;
      default:              offsets = [0, 180, 150];
    }

    var primaryL   = dark ? 0.72 : 0.22;
    var secondaryL = dark ? 0.58 : 0.52;
    var accentL    = dark ? 0.66 : 0.58;

    /* Monochromatic separates by lightness rather than hue. */
    if (scheme === 'monochrome') {
      secondaryL = dark ? 0.44 : 0.62;
      accentL    = dark ? 0.82 : 0.42;
    }

    return {
      primaryColor:    hslToHex(h + offsets[0], s, primaryL),
      secondaryColor:  hslToHex(h + offsets[1], s * 0.9, secondaryL),
      accentColor:     hslToHex(h + offsets[2], Math.min(0.95, s * 1.1), accentL),
      backgroundColor: dark ? hslToHex(h, s * 0.35, 0.08) : hslToHex(h, s * 0.25, 0.97)
    };
  }


  /* ======================================================================
     §4  SVG PRIMITIVES
     Every builder returns a markup string. None emits an id attribute.
     ====================================================================== */

  function rect(x, y, w, h, rx, attrs) {
    return '<rect x="' + n(x) + '" y="' + n(y) +
           '" width="' + n(Math.max(0, w)) + '" height="' + n(Math.max(0, h)) +
           '" rx="' + n(Math.max(0, rx)) + '" ' + attrs + '/>';
  }

  function circle(cx, cy, r, attrs) {
    return '<circle cx="' + n(cx) + '" cy="' + n(cy) +
           '" r="' + n(Math.max(0, r)) + '" ' + attrs + '/>';
  }

  function path(d, attrs) { return '<path d="' + d + '" ' + attrs + '/>'; }

  function line(x1, y1, x2, y2, attrs) {
    return '<line x1="' + n(x1) + '" y1="' + n(y1) +
           '" x2="' + n(x2) + '" y2="' + n(y2) + '" ' + attrs + '/>';
  }

  function fillAttr(colour) { return 'fill="' + colour + '"'; }

  function strokeAttr(colour, width, extra) {
    return 'fill="none" stroke="' + colour + '" stroke-width="' + n(width) + '"' +
           (extra ? ' ' + extra : '');
  }

  /* Paint attributes for a body shape, honouring Outlines mode.
     In 'outline' mode a shape that would be filled becomes a stroked
     silhouette instead. Kept in one place so every renderer obeys it. */
  function surfaceAttrs(ctx, colour, extra) {
    if (ctx.outline) {
      return strokeAttr(colour, ctx.outlineWeight,
        'stroke-linejoin="round"' + (extra ? ' ' + extra : ''));
    }
    return fillAttr(colour) + (extra ? ' ' + extra : '');
  }

  /* Text builder.

     Two deliberate details, both about portability:
     1. No dominant-baseline. The y value is computed explicitly from font
        size, because design programs handle dominant-baseline badly.
     2. Letter spacing appends trailing space after the final character,
        dragging centred text off-centre by half the spacing. The +ls/2
        shift cancels that. It does NOT apply to start-anchored text. */
  function svgText(opts) {
    var anchor = opts.anchor || 'middle';
    var x = opts.x + (anchor === 'middle' ? (opts.letterSpacing / 2) : 0);
    var y = opts.centreY + (opts.fontSize * CAP_CENTRE_RATIO);

    return '<text x="' + n(x) + '" y="' + n(y) + '"' +
           ' font-family="' + opts.fontFamily + '"' +
           ' font-size="' + n(opts.fontSize) + '"' +
           ' font-weight="' + (opts.weight || 700) + '"' +
           ' letter-spacing="' + n(opts.letterSpacing) + '"' +
           ' text-anchor="' + anchor + '"' +
           ' fill="' + opts.fill + '">' + opts.text + '</text>';
  }

  /* Regular polygon with genuinely rounded corners: each vertex is cut back
     along both edges by the radius and rejoined with an arc. Arcs need no
     ids, so this honours the corner control inside the purity constraint. */
  function roundedPolygonPath(cx, cy, radius, sides, rotationDeg, cornerR) {
    var pts = polygonPoints(cx, cy, radius, sides, rotationDeg);
    var i;

    if (cornerR <= 0.5) {
      return 'M ' + pts.map(function (p) { return n(p[0]) + ' ' + n(p[1]); }).join(' L ') + ' Z';
    }

    /* Never round by more than half the shortest edge, or the shape inverts. */
    var shortest = Infinity;
    for (i = 0; i < sides; i++) {
      var a = pts[i], b = pts[(i + 1) % sides];
      shortest = Math.min(shortest, Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    var r = Math.max(0.5, Math.min(cornerR, (shortest / 2) - 0.5));

    var d = '';
    for (i = 0; i < sides; i++) {
      var prev = pts[(i - 1 + sides) % sides];
      var cur  = pts[i];
      var next = pts[(i + 1) % sides];
      var entry = pointTowards(cur, prev, r);
      var exit  = pointTowards(cur, next, r);
      d += (i === 0 ? 'M ' : ' L ') + n(entry[0]) + ' ' + n(entry[1]);
      d += ' A ' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(exit[0]) + ' ' + n(exit[1]);
    }
    return d + ' Z';
  }

  function polygonPoints(cx, cy, radius, sides, rotationDeg) {
    var pts = [];
    var start = (rotationDeg - 90) * Math.PI / 180;
    for (var i = 0; i < sides; i++) {
      var a = start + (i * 2 * Math.PI / sides);
      pts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
    }
    return pts;
  }

  function pointTowards(from, to, distance) {
    var dx = to[0] - from[0], dy = to[1] - from[1];
    var len = Math.hypot(dx, dy) || 1;
    return [from[0] + (dx / len) * distance, from[1] + (dy / len) * distance];
  }


  /* ======================================================================
     §5  GRADIENT BANDING  —  gradients without ids

     WHY THIS EXISTS
     ---------------
     A real SVG gradient is <linearGradient id="..."> plus fill="url(#id)".
     There is no id-free syntax for it. With several inline copies of
     different artwork on one page (the five previews plus every gallery
     thumbnail), duplicate ids collide: the browser resolves every
     url(#id) to the FIRST matching element in document order, so every
     thumbnail would render with the first concept's gradient.

     So a gradient is synthesised as N flat-filled shapes with interpolated
     colours. Two decomposition strategies, chosen by shape:

       'linear'     — horizontal bands whose width follows the shape's own
                      cross-section at that height. Exact for rectangles
                      (including rounded corners) and circles. No clipping
                      and no knockout rectangle, so transparency survives.

       'concentric' — the shape redrawn at decreasing scale with
                      interpolated colours. Used for polygons, where an
                      exact cross-section through rounded corners is not
                      worth the complexity. Reads as a radial blend.

     Bands overlap by BAND_OVERLAP to prevent anti-aliasing hairlines
     between adjacent fills.

     KNOWN LIMIT: this cannot gradient TEXT. Filling glyphs with a gradient
     requires either a real gradient paint server or glyph outlines, and
     both are unavailable here. Text stays flat when gradients are on.
     ====================================================================== */

  var BAND_OVERLAP = 0.6;

  /* Horizontal half-width of a rounded rectangle at height y. */
  function roundedRectHalfWidth(y, rectY, h, w, rx) {
    var half = w / 2;
    if (rx <= 0) return half;
    var top = rectY + rx, bottom = rectY + h - rx;
    var dy = 0;
    if (y < top)         dy = top - y;
    else if (y > bottom) dy = y - bottom;
    else                 return half;
    if (dy >= rx) return half - rx;
    return half - (rx - Math.sqrt(Math.max(0, rx * rx - dy * dy)));
  }

  /* Emits a vertically banded fill for a rect or circle.
     spec: { kind:'rect', x, y, w, h, rx } | { kind:'circle', cx, cy, r } */
  function bandedLinear(ctx, spec, fromColour, toColour) {
    var out = [];
    var bands = Math.round(ctx.state.gradientBands);
    var top, height, centreX;

    if (spec.kind === 'circle') {
      top = spec.cy - spec.r; height = spec.r * 2; centreX = spec.cx;
    } else {
      top = spec.y; height = spec.h; centreX = spec.x + spec.w / 2;
    }

    var step = height / bands;

    for (var i = 0; i < bands; i++) {
      var yTop = top + i * step;
      var yBot = yTop + step;

      /* Use the narrower of the band's two edges so no band can overflow
         the silhouette. Slight stair-stepping at the extremes is the cost;
         overflowing the shape would be a visible defect. */
      var halfWidth;
      if (spec.kind === 'circle') {
        halfWidth = Math.min(chordHalfWidth(spec.r, yTop - spec.cy),
                             chordHalfWidth(spec.r, yBot - spec.cy));
      } else {
        halfWidth = Math.min(roundedRectHalfWidth(yTop, spec.y, spec.h, spec.w, spec.rx),
                             roundedRectHalfWidth(yBot, spec.y, spec.h, spec.w, spec.rx));
      }
      if (halfWidth <= 0.2) continue;

      var t = bands === 1 ? 0 : i / (bands - 1);
      out.push(rect(
        centreX - halfWidth,
        yTop - (i === 0 ? 0 : BAND_OVERLAP),
        halfWidth * 2,
        step + (i === 0 ? BAND_OVERLAP : BAND_OVERLAP * 2),
        0,
        fillAttr(mixHex(fromColour, toColour, t))
      ));
    }
    return out;
  }

  function chordHalfWidth(r, dy) {
    var v = r * r - dy * dy;
    return v <= 0 ? 0 : Math.sqrt(v);
  }

  /* Emits a concentric banded fill. `build(scale)` must return a path `d`
     for the shape drawn at that scale, so this works for any geometry the
     renderer can already produce. */
  function bandedConcentric(ctx, build, fromColour, toColour) {
    var out = [];
    var bands = Math.round(ctx.state.gradientBands);
    for (var i = 0; i < bands; i++) {
      var t = bands === 1 ? 0 : i / (bands - 1);
      var scale = 1 - (i / bands);
      out.push(path(build(scale), fillAttr(mixHex(fromColour, toColour, t))));
    }
    return out;
  }

  /* Single entry point used by renderers.

     `spec.fallback` is the plain flat-filled markup to emit when gradients
     are off, in outline mode, or in monochrome — so a renderer expresses
     "this is the body shape" once and every mode is handled centrally. */
  function bodyFill(ctx, spec) {
    if (!ctx.gradient) return [spec.fallback];

    var from = spec.from || ctx.colors.primary;
    var to = ctx.colors.gradientTo;

    if (spec.kind === 'concentric') {
      return bandedConcentric(ctx, spec.build, from, to);
    }
    return bandedLinear(ctx, spec, from, to);
  }


  /* ======================================================================
     §6  STYLE RENDERERS

     Each renderer takes (ctx, frame) and returns an array of markup
     strings. `frame` is {cx, cy, size, scale} — the square region the mark
     must fill. Making renderers frame-relative rather than canvas-relative
     is what allows the Lockup layout to embed any mark inside itself
     without duplicating a single line of geometry.

     Renderers do geometry only. They never escape text, never clamp values
     and never read the DOM: all of that happened in normalizeState(), so
     bugs of that class can only live in one place.
     ====================================================================== */

  var RENDERERS = {};

  /* ---- Monogram: initials on a rounded plate ---- */
  RENDERERS.monogram = function (ctx, frame) {
    var out = [];
    var c = ctx.colors;
    var size = clamp(frame.size * (ctx.state.iconSize / 100), 60, frame.size);
    var x = frame.cx - size / 2;
    var y = frame.cy - size / 2;
    var bt = ctx.state.borderThickness * frame.scale;
    var rx = Math.min(ctx.state.cornerRadius * frame.scale, size / 2);

    out = out.concat(bodyFill(ctx, {
      kind: 'rect', x: x, y: y, w: size, h: size, rx: rx, from: c.primary,
      fallback: rect(x, y, size, size, rx, surfaceAttrs(ctx, c.primary))
    }));

    if (bt > 0) {
      out.push(rect(x + bt / 2, y + bt / 2, size - bt, size - bt,
                    Math.max(0, rx - bt / 2), strokeAttr(c.accent, bt)));
    }

    out.push(svgText({
      /* Always the initials, never ctx.text: inside a lockup ctx.text is
         the full name, and a monogram plate must show initials. */
      text: ctx.initialsText, x: frame.cx, centreY: frame.cy - size * 0.04,
      fontFamily: ctx.fontFamily, fontSize: ctx.fontSize * frame.scale,
      letterSpacing: ctx.letterSpacing * frame.scale,
      anchor: 'middle', fill: c.contrastText
    }));

    var barW = size * 0.30;
    var barH = Math.max(4 * frame.scale, bt * 0.55);
    out.push(rect(frame.cx - barW / 2, frame.cy + size * 0.22, barW, barH,
                  barH / 2, fillAttr(c.secondary)));
    return out;
  };

  /* ---- Circular badge: initials inside a ringed disc ---- */
  RENDERERS.badge = function (ctx, frame) {
    var out = [];
    var c = ctx.colors;
    var R = clamp(frame.size * (ctx.state.iconSize / 100), 60, frame.size) / 2;
    var bt = ctx.state.borderThickness * frame.scale;

    out = out.concat(bodyFill(ctx, {
      kind: 'circle', cx: frame.cx, cy: frame.cy, r: R, from: c.primary,
      fallback: circle(frame.cx, frame.cy, R, surfaceAttrs(ctx, c.primary))
    }));

    if (bt > 0) out.push(circle(frame.cx, frame.cy, R - bt / 2, strokeAttr(c.secondary, bt)));

    if (ctx.state.badgeInnerRing) {
      var innerR = Math.max(6, R - bt - ctx.state.badgeRingGap * frame.scale);
      out.push(circle(frame.cx, frame.cy, innerR, strokeAttr(c.accent, Math.max(2, bt * 0.6))));
    }

    out.push(svgText({
      text: ctx.initialsText, x: frame.cx, centreY: frame.cy,
      fontFamily: ctx.fontFamily, fontSize: ctx.fontSize * frame.scale,
      letterSpacing: ctx.letterSpacing * frame.scale,
      anchor: 'middle', fill: c.contrastText
    }));
    return out;
  };

  /* ---- Geometric symbol: rounded polygon with a true cut-out core ---- */
  RENDERERS.symbol = function (ctx, frame) {
    var out = [];
    var c = ctx.colors;
    var s = ctx.state;
    var R = clamp(frame.size * (s.iconSize / 100), 60, frame.size) / 2;
    var bt = s.borderThickness * frame.scale;
    var sides = Math.round(s.symbolSides);

    /* The corner control is calibrated for the monogram's large square
       plate. At full strength on a polygon it rounds corners so far that a
       hexagon becomes a flower, so it is scaled down and capped here. */
    var cornerR = Math.min(s.cornerRadius * frame.scale * 0.45, R * 0.3);
    var innerScale = s.symbolInnerScale / 100;

    function shapeAt(scale) {
      var d = roundedPolygonPath(frame.cx, frame.cy, (R - bt / 2) * scale,
                                 sides, s.symbolRotation, cornerR * scale);
      if (innerScale > 0.02) {
        d += ' ' + roundedPolygonPath(frame.cx, frame.cy, (R - bt) * innerScale * scale,
                                      sides, s.symbolRotation + (180 / sides),
                                      cornerR * innerScale * scale);
      }
      return d;
    }

    /* The inner shape is a GENUINE hole via fill-rule="evenodd", not a
       background-coloured patch on top. evenodd needs no id, and a real
       hole works on any background where a patch would only match one. */
    out = out.concat(bodyFill(ctx, {
      kind: 'concentric', build: shapeAt, from: c.secondary,
      fallback: path(shapeAt(1),
        (ctx.outline
          ? strokeAttr(c.secondary, ctx.outlineWeight, 'stroke-linejoin="round"')
          : fillAttr(c.secondary) + ' fill-rule="evenodd"'))
    }));

    /* Outline stroke sits on top of the banding so the silhouette stays crisp. */
    if (bt > 0 && !ctx.outline) {
      out.push(path(shapeAt(1),
        strokeAttr(c.accent, bt, 'stroke-linejoin="round"') ));
    }
    return out;
  };

  /* ---- Orbit symbol: a seeded generative network mark ----
     Deterministic: the same seed always produces the same arrangement, so
     the saved state fully describes the artwork. makeRandom() is used, not
     Math.random(). */
  RENDERERS.orbit = function (ctx, frame) {
    var out = [];
    var c = ctx.colors;
    var s = ctx.state;
    var R = clamp(frame.size * (s.iconSize / 100), 60, frame.size) / 2;
    var bt = s.borderThickness * frame.scale;
    var nodes = Math.round(s.orbitNodes);
    var rand = makeRandom(Math.round(s.orbitSeed));
    var hubR = R * 0.20;

    /* Positions are computed first so spokes can be drawn beneath dots. */
    var placed = [];
    for (var i = 0; i < nodes; i++) {
      var jitter = (rand() - 0.5) * 0.55;
      var angle = (i * 2 * Math.PI / nodes) + jitter - Math.PI / 2;
      var dist = R * (s.orbitSpread / 100) * (0.6 + rand() * 0.4);
      placed.push({
        x: frame.cx + dist * Math.cos(angle),
        y: frame.cy + dist * Math.sin(angle),
        r: R * (s.orbitDotScale / 100) * (0.4 + rand() * 0.35)
      });
    }

    if (bt > 0) out.push(circle(frame.cx, frame.cy, R - bt / 2, strokeAttr(c.secondary, bt)));

    if (s.orbitSpokes) {
      var spokeW = Math.max(2 * frame.scale, bt * 0.4);
      placed.forEach(function (p) {
        out.push(line(frame.cx, frame.cy, p.x, p.y,
                      'stroke="' + c.secondary + '" stroke-width="' + n(spokeW) +
                      '" stroke-linecap="round"'));
      });
    }

    placed.forEach(function (p, index) {
      out.push(circle(p.x, p.y, p.r,
        surfaceAttrs(ctx, index % 2 === 0 ? c.accent : c.primary)));
    });

    out = out.concat(bodyFill(ctx, {
      kind: 'circle', cx: frame.cx, cy: frame.cy, r: hubR, from: c.primary,
      fallback: circle(frame.cx, frame.cy, hubR, surfaceAttrs(ctx, c.primary))
    }));
    return out;
  };

  /* ---- Geometric avatar: an abstract face from primitives only ---- */
  RENDERERS.avatar = function (ctx, frame) {
    var out = [];
    var c = ctx.colors;
    var s = ctx.state;
    var bt = s.borderThickness * frame.scale;

    var base = clamp(frame.size * (s.iconSize / 100), 60, frame.size);
    var headW = clamp(base * (s.avatarHeadWidth / 100) * 0.78, 40, frame.size);
    var headH = clamp(base * (s.avatarHeadHeight / 100) * 0.78, 40, frame.size);

    var offsetY = (s.avatarEars === 'antenna') ? 18 * frame.scale : 0;
    var hx = frame.cx - headW / 2;
    var hy = frame.cy - headH / 2 + offsetY;
    var rx = Math.min(s.cornerRadius * frame.scale, Math.min(headW, headH) / 2);

    /* Ears and antennae are drawn FIRST so the head overlaps them. */
    if (s.avatarEars === 'ears') {
      var earR = headW * 0.14;
      out.push(circle(hx, hy + headH * 0.34, earR, fillAttr(c.secondary)));
      out.push(circle(hx + headW, hy + headH * 0.34, earR, fillAttr(c.secondary)));
    } else if (s.avatarEars === 'antenna') {
      var stemW = Math.max(3 * frame.scale, bt * 0.5);
      var tipR = Math.max(5 * frame.scale, bt * 0.7);
      var stemAttrs = 'stroke="' + c.secondary + '" stroke-width="' + n(stemW) +
                      '" stroke-linecap="round"';
      var lift = 44 * frame.scale;
      out.push(line(frame.cx - headW * 0.20, hy + 10 * frame.scale,
                    frame.cx - headW * 0.34, hy - lift, stemAttrs));
      out.push(circle(frame.cx - headW * 0.34, hy - lift, tipR, fillAttr(c.secondary)));
      out.push(line(frame.cx + headW * 0.20, hy + 10 * frame.scale,
                    frame.cx + headW * 0.34, hy - lift, stemAttrs));
      out.push(circle(frame.cx + headW * 0.34, hy - lift, tipR, fillAttr(c.secondary)));
    }

    out = out.concat(bodyFill(ctx, {
      kind: 'rect', x: hx, y: hy, w: headW, h: headH, rx: rx, from: c.primary,
      fallback: rect(hx, hy, headW, headH, rx, surfaceAttrs(ctx, c.primary))
    }));

    if (bt > 0) {
      out.push(rect(hx + bt / 2, hy + bt / 2, headW - bt, headH - bt,
                    Math.max(0, rx - bt / 2), strokeAttr(c.accent, bt)));
    }

    var eyeR = Math.max(2, headW * (s.avatarEyeSize / 100) * 0.5);
    var eyeDX = headW * (s.avatarEyeSpacing / 100) * 0.5;
    var eyeY = hy + headH * 0.42;
    out.push(circle(frame.cx - eyeDX, eyeY, eyeR, fillAttr(c.contrastText)));
    out.push(circle(frame.cx + eyeDX, eyeY, eyeR, fillAttr(c.contrastText)));

    var mouthY = hy + headH * 0.70;
    if (s.avatarMouth === 'line') {
      var mw = headW * 0.28;
      var mh = Math.max(3 * frame.scale, bt * 0.5);
      out.push(rect(frame.cx - mw / 2, mouthY - mh / 2, mw, mh, mh / 2, fillAttr(c.contrastText)));
    } else if (s.avatarMouth === 'smile') {
      var half = headW * 0.16;
      var arcR = headW * 0.22;
      /* Sweep flag 0 curves the arc downwards in SVG's y-down coordinates. */
      out.push(path(
        'M ' + n(frame.cx - half) + ' ' + n(mouthY) +
        ' A ' + n(arcR) + ' ' + n(arcR) + ' 0 0 0 ' + n(frame.cx + half) + ' ' + n(mouthY),
        strokeAttr(c.contrastText, Math.max(3 * frame.scale, bt * 0.55), 'stroke-linecap="round"')
      ));
    } else if (s.avatarMouth === 'dot') {
      out.push(circle(frame.cx, mouthY, Math.max(3 * frame.scale, headW * 0.045),
                      fillAttr(c.contrastText)));
    }
    return out;
  };

  /* ---- Wordmark: the name as type, with rules above and below ---- */
  RENDERERS.wordmark = function (ctx) {
    var out = [];
    var c = ctx.colors;
    var bt = ctx.state.borderThickness;

    if (bt > 0) {
      var kickerW = 140, kickerH = Math.max(3, bt * 0.5);
      out.push(rect(ctx.cx - kickerW / 2, ctx.cy - ctx.fontSize * 0.55 - 30,
                    kickerW, kickerH, kickerH / 2, fillAttr(c.secondary)));
    }

    /* Wordmark text sits directly on the background, so it uses the primary
       colour rather than the knockout colour. Text is never banded — see §5. */
    out.push(svgText({
      text: ctx.text, x: ctx.cx, centreY: ctx.cy,
      fontFamily: ctx.fontFamily, fontSize: ctx.fontSize,
      letterSpacing: ctx.letterSpacing, anchor: 'middle', fill: c.primary
    }));

    if (bt > 0) {
      var inset = 110;
      var ruleY = ctx.cy + ctx.fontSize * 0.42 + 26;
      out = out.concat(bodyFill(ctx, {
        kind: 'rect', x: inset, y: ruleY, w: ctx.w - inset * 2, h: bt, rx: bt / 2,
        from: c.accent,
        fallback: rect(inset, ruleY, ctx.w - inset * 2, bt, bt / 2, fillAttr(c.accent))
      }));
    }
    return out;
  };

  /* Vertical metrics for a stacked lockup. Pure: it is used both to draw
     the composition and to work out the largest font size that still fits,
     so the two can never disagree. */
  function stackedMetrics(ctx) {
    var s = ctx.state;
    var markSize = ctx.h * 0.46;
    var gap = s.lockupGap * 0.5;
    var nameH = ctx.fontSize;
    var tagH = ctx.tagline ? ctx.taglineFontSize * 1.6 : 0;
    var total = markSize + gap + nameH + tagH;
    var top = ctx.cy - total / 2;

    var markCy = top + markSize / 2;
    var nameCy = top + markSize + gap + nameH / 2;
    return {
      markSize: markSize,
      markCy: markCy,
      nameCy: nameCy,
      taglineCy: nameCy + nameH / 2 + tagH / 2,
      total: total
    };
  }

  /* ---- Lockup: a mark plus name and tagline ----
     Embeds any square mark by handing its renderer a sub-frame. No mark
     geometry is duplicated here. */
  RENDERERS.lockup = function (ctx) {
    var out = [];
    var c = ctx.colors;
    var s = ctx.state;
    var markRenderer = RENDERERS[s.lockupMark] || RENDERERS.monogram;
    var hasTagline = !!ctx.tagline;
    var margin = 48;

    if (s.lockupArrangement === 'stacked') {
      /* The stack is measured first and then centred as a whole. Anchoring
         it to the top instead lets a large font push the tagline off the
         bottom of a fixed canvas — the composition must own its own height. */
      var metrics = stackedMetrics(ctx);

      out = out.concat(markRenderer(ctx, {
        cx: ctx.cx, cy: metrics.markCy,
        size: metrics.markSize, scale: metrics.markSize / 512
      }));

      out.push(svgText({
        text: ctx.text, x: ctx.cx, centreY: metrics.nameCy,
        fontFamily: ctx.fontFamily, fontSize: ctx.fontSize,
        letterSpacing: ctx.letterSpacing, anchor: 'middle', fill: c.primary
      }));

      if (hasTagline) {
        out.push(svgText({
          text: ctx.tagline, x: ctx.cx, centreY: metrics.taglineCy,
          fontFamily: ctx.secondaryFontFamily, fontSize: ctx.taglineFontSize,
          letterSpacing: ctx.taglineLetterSpacing, weight: 500,
          anchor: 'middle', fill: c.secondary
        }));
      }
      return out;
    }

    /* Horizontal: mark on the left, text block left-aligned beside it. */
    var markSize = ctx.h * 0.80;
    var markCx = margin + markSize / 2;
    var textX = markCx + markSize / 2 + s.lockupGap;

    out = out.concat(markRenderer(ctx, {
      cx: markCx, cy: ctx.cy, size: markSize, scale: markSize / 512
    }));

    var nameCy = hasTagline ? ctx.cy - ctx.taglineFontSize * 0.8 : ctx.cy;
    out.push(svgText({
      text: ctx.text, x: textX, centreY: nameCy,
      fontFamily: ctx.fontFamily, fontSize: ctx.fontSize,
      letterSpacing: ctx.letterSpacing, anchor: 'start', fill: c.primary
    }));

    if (hasTagline) {
      out.push(svgText({
        text: ctx.tagline, x: textX,
        centreY: nameCy + ctx.fontSize * 0.55 + ctx.taglineFontSize * 0.9,
        fontFamily: ctx.secondaryFontFamily, fontSize: ctx.taglineFontSize,
        letterSpacing: ctx.taglineLetterSpacing, weight: 500,
        anchor: 'start', fill: c.secondary
      }));
    }
    return out;
  };


  /* ======================================================================
     §7  SVG ASSEMBLY — the core
     ====================================================================== */

  /* Turns raw state into a safe, clamped drawing context. Every value a
     renderer touches passes through here: text escaped, numbers clamped,
     colours resolved, monochrome / outline / adaptive contrast applied. */
  function normalizeState(s) {
    var styleDef = STYLES[s.style] || STYLES.monogram;
    var fontDef = findFontStack(s.fontFamily) || FONT_STACKS[0];
    var secondFontDef = findFontStack(s.secondaryFontFamily) || FONT_STACKS[0];

    var outline = (s.renderMode === 'outline');

    /* Gradients are suppressed in monochrome (a single-colour logo with a
       two-colour blend is a contradiction) and in outline mode (there is no
       fill to band). Decided once, here, so no renderer has to know. */
    var gradient = !!s.gradientEnabled && !s.monochrome && !outline;

    var primary = s.primaryColor;
    var secondary = s.monochrome ? primary : s.secondaryColor;
    var accent = s.monochrome ? primary : s.accentColor;

    /* Knockout colour — letters, eyes, the mouth: anything sitting on top
       of a filled mark. Three cases, in priority order:
         outline mode  -> primary, because there is no filled plate behind it
         autoContrast  -> whichever candidate reads best on the primary fill
         otherwise     -> the background colour, so shapes punch through */
    var contrastText;
    if (outline) {
      contrastText = primary;
    } else if (s.autoContrast) {
      contrastText = bestContrast(primary, [s.backgroundColor, '#ffffff', '#000000']);
    } else {
      contrastText = s.backgroundColor;
    }

    var colors = {
      primary: primary,
      secondary: secondary,
      accent: accent,
      background: s.backgroundColor,
      contrastText: contrastText,
      gradientTo: s.gradientTo
    };

    var rawText = styleDef.textKey ? s[styleDef.textKey] : '';
    var rawTagline = (s.style === 'lockup') ? (s.taglineText || '') : '';

    return {
      state: s,
      style: s.style,
      w: styleDef.w,
      h: styleDef.h,
      cx: styleDef.w / 2,
      cy: styleDef.h / 2,
      colors: colors,
      outline: outline,
      outlineWeight: Math.max(4, s.borderThickness),
      gradient: gradient,
      fontFamily: escapeXml(fontDef.stack),
      secondaryFontFamily: escapeXml(secondFontDef.stack),
      fontSize: s.fontSize,
      letterSpacing: s.letterSpacing,
      taglineFontSize: s.taglineFontSize,
      taglineLetterSpacing: s.taglineLetterSpacing,
      text: escapeXml(rawText),
      rawText: rawText,
      initialsText: escapeXml(s.initials || ''),
      tagline: escapeXml(rawTagline),
      rawTagline: rawTagline,
      title: escapeXml((s.creatorName || 'Untitled') + ' — ' + styleDef.label + ' logo')
    };
  }

  /* Produces the one and only SVG string.

     No <?xml ... ?> declaration: it is optional for SVG, and omitting it
     means the identical string can be injected with innerHTML AND written
     to disk unchanged. That byte-for-byte sameness is the whole point. */
  function buildSVG(s) {
    var ctx = normalizeState(s);
    var renderer = RENDERERS[ctx.style] || RENDERERS.monogram;

    /* Default frame: the largest square that fits the canvas. */
    var frame = {
      cx: ctx.cx,
      cy: ctx.cy,
      size: Math.min(ctx.w, ctx.h),
      scale: Math.min(ctx.w, ctx.h) / 512
    };
    if (ctx.style === 'wordmark' || ctx.style === 'lockup') frame.scale = 1;

    var parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + ctx.w + ' ' + ctx.h +
               '" width="' + ctx.w + '" height="' + ctx.h + '" role="img">');
    /* <title> as first child gives the accessible name and needs no id. */
    parts.push('  <title>' + ctx.title + '</title>');

    if (!s.transparentBackground) {
      parts.push('  ' + rect(0, 0, ctx.w, ctx.h, 0, fillAttr(ctx.colors.background)));
    }

    renderer(ctx, frame).forEach(function (markup) { parts.push('  ' + markup); });

    parts.push('</svg>');
    return parts.join('\n');
  }


  /* ======================================================================
     §8  PREVIEW — the single-string guarantee, in five lines
     ====================================================================== */

  var previewFrames = null;

  function paintPreviews() {
    if (!previewFrames) previewFrames = document.querySelectorAll('[data-preview]');

    for (var i = 0; i < previewFrames.length; i++) {
      /* The SAME string, every time. Frames differ only in the CSS applied
         to their container: background colour, size and opacity. */
      previewFrames[i].innerHTML = currentSVG;
    }

    var raw = byId('raw-svg-text');
    if (raw) raw.value = currentSVG;

    var meta = byId('svg-meta');
    if (meta) {
      var def = STYLES[state.style];
      meta.textContent = 'One SVG string • ' + currentSVG.length.toLocaleString() +
        ' characters • ' + def.w + '×' + def.h + ' canvas • shown in ' +
        previewFrames.length + ' frames, exported unchanged' +
        (state.gradientEnabled && !state.monochrome && state.renderMode === 'solid'
          ? ' • ' + Math.round(state.gradientBands) + ' gradient bands' : '');
    }
  }

  /* The single place that rebuilds everything after any change. */
  function render() {
    currentSVG = buildSVG(state);
    paintPreviews();
    updateOverflowWarning();
  }


  /* ======================================================================
     §9  HISTORY — undo / redo

     Cheap because state is a small serialisable object: a snapshot is just
     JSON.stringify(state). Rapid edits to the same control inside
     COALESCE_MS collapse into one entry, so dragging a slider produces one
     undo step rather than two hundred.
     ====================================================================== */

  var HISTORY_LIMIT = 80;
  var COALESCE_MS = 500;

  var history = [];
  var historyIndex = -1;
  var lastPushKey = '';
  var lastPushTime = 0;

  function pushHistory(key) {
    var snapshot = JSON.stringify(state);
    if (history[historyIndex] === snapshot) return;

    var now = Date.now();
    var coalesce = key && key === lastPushKey &&
                   (now - lastPushTime) < COALESCE_MS && historyIndex >= 0;

    if (coalesce) {
      history[historyIndex] = snapshot;
    } else {
      history = history.slice(0, historyIndex + 1);
      history.push(snapshot);
      if (history.length > HISTORY_LIMIT) history.shift();
      historyIndex = history.length - 1;
    }

    lastPushKey = key || '';
    lastPushTime = now;
    updateHistoryButtons();
  }

  function applySnapshot(index) {
    historyIndex = index;
    var restored = sanitiseState(JSON.parse(history[index]));
    if (!restored) return;
    state = restored;
    /* Break coalescing so the next edit starts a fresh entry. */
    lastPushKey = '';
    applyStateToControls();
    render();
    updateHistoryButtons();
  }

  function undo() {
    if (historyIndex <= 0) return;
    applySnapshot(historyIndex - 1);
    setStatus('Undone.');
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    applySnapshot(historyIndex + 1);
    setStatus('Redone.');
  }

  function updateHistoryButtons() {
    var u = byId('btn-undo'), r = byId('btn-redo');
    if (u) u.disabled = historyIndex <= 0;
    if (r) r.disabled = historyIndex >= history.length - 1;
  }


  /* ======================================================================
     §10  CONTROLS
     ====================================================================== */

  function buildFontOptions() {
    ['fontFamily', 'secondaryFontFamily'].forEach(function (id) {
      var select = byId(id);
      if (!select) return;
      FONT_STACKS.forEach(function (font) {
        var option = document.createElement('option');
        option.value = font.id;
        option.textContent = font.label;
        select.appendChild(option);
      });
    });

    var harmony = byId('harmonyScheme');
    if (harmony) {
      HARMONY_SCHEMES.forEach(function (scheme) {
        var option = document.createElement('option');
        option.value = scheme.id;
        option.textContent = scheme.label;
        harmony.appendChild(option);
      });
    }
  }

  function buildPaletteButtons() {
    var host = byId('palette-list');
    PALETTES.forEach(function (palette) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'palette-btn';
      button.title = 'Apply the ' + palette.name + ' palette';

      var swatches = document.createElement('span');
      swatches.className = 'swatches';
      ['primary', 'secondary', 'accent', 'background'].forEach(function (role) {
        var dot = document.createElement('span');
        dot.className = 'swatch';
        dot.style.background = palette[role];
        swatches.appendChild(dot);
      });

      var label = document.createElement('span');
      label.textContent = palette.name;
      button.appendChild(swatches);
      button.appendChild(label);

      button.addEventListener('click', function () {
        state.primaryColor = palette.primary;
        state.secondaryColor = palette.secondary;
        state.accentColor = palette.accent;
        state.backgroundColor = palette.background;
        applyStateToControls();
        render();
        pushHistory('palette');
        setStatus('Applied the ' + palette.name + ' palette.', 'ok');
      });

      host.appendChild(button);
    });
  }

  /* One generic handler for every control; each input names its state
     field with data-key. */
  function onControlInput(event) {
    var el = event.target;
    var key = el.getAttribute('data-key');
    if (!key) return;

    var value;
    if (el.type === 'checkbox') {
      value = el.checked;
    } else if (el.type === 'radio') {
      if (!el.checked) return;
      value = el.value;
    } else if (el.type === 'range' || el.type === 'number') {
      value = Number(el.value);
      var range = NUMERIC_RANGES[key];
      if (range) value = clamp(value, range[0], range[1]);
    } else {
      value = el.value;
    }

    state[key] = value;
    /* Refresh on EVERY change, not just style changes: renderMode and
       monochrome both suppress gradients, and the explanatory note that
       says so lives in updateControlAvailability(). */
    updateControlAvailability();
    syncReadouts();
    render();
    pushHistory(key);
  }

  function bindControls() {
    var inputs = document.querySelectorAll('[data-key]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('input', onControlInput);
      inputs[i].addEventListener('change', onControlInput);
    }
  }

  function applyStateToControls() {
    var inputs = document.querySelectorAll('[data-key]');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      var key = el.getAttribute('data-key');
      var value = state[key];

      if (el.type === 'checkbox') {
        el.checked = !!value;
      } else if (el.type === 'radio') {
        el.checked = (el.value === value);
        var wrapper = el.closest('.style-opt');
        if (wrapper) wrapper.classList.toggle('is-selected', el.checked);
      } else {
        el.value = value;
      }
    }
    syncReadouts();
    updateControlAvailability();
  }

  var PERCENT_KEYS = ['iconSize', 'symbolInnerScale', 'avatarHeadWidth', 'avatarHeadHeight',
                      'avatarEyeSize', 'avatarEyeSpacing', 'orbitSpread', 'orbitDotScale'];

  function syncReadouts() {
    var outputs = document.querySelectorAll('[data-readout]');
    for (var i = 0; i < outputs.length; i++) {
      var key = outputs[i].getAttribute('data-readout');
      var value = state[key];
      var suffix = '';
      if (PERCENT_KEYS.indexOf(key) !== -1) suffix = '%';
      else if (key === 'symbolRotation') suffix = '°';
      else if (key === 'symbolSides') suffix = ' sides';
      else if (key === 'orbitNodes') suffix = ' nodes';
      else if (key === 'gradientBands') suffix = ' bands';
      outputs[i].textContent = value + suffix;
    }
  }

  /* Dims controls the current style ignores, rather than leaving the user
     to discover that a slider does nothing. */
  function updateControlAvailability() {
    var allowed = (STYLE_CONTROLS[state.style] || []).concat(SHARED_ALWAYS);

    var fields = document.querySelectorAll('[data-control]');
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i].getAttribute('data-control');
      fields[i].classList.toggle('is-na', allowed.indexOf(key) === -1);
    }

    var groups = document.querySelectorAll('[data-style-group]');
    for (var j = 0; j < groups.length; j++) {
      var owners = groups[j].getAttribute('data-style-group').split(' ');
      groups[j].hidden = (owners.indexOf(state.style) === -1);
    }

    var fitButton = byId('btn-fit-text');
    if (fitButton) fitButton.disabled = !STYLES[state.style].textKey;

    /* Gradients and outline mode are mutually exclusive; say so rather than
       letting a control silently do nothing. */
    var note = byId('gradient-note');
    if (note) {
      if (state.renderMode === 'outline') {
        note.textContent = 'Gradients are off while Outlines mode is on — there is no fill to band.';
        note.hidden = false;
      } else if (state.monochrome) {
        note.textContent = 'Gradients are off while Monochrome is on.';
        note.hidden = false;
      } else {
        note.hidden = true;
      }
    }
  }


  /* ======================================================================
     §11  TEXT MEASUREMENT

     Text width cannot be calculated without asking the browser, and the
     answer depends on the fonts THIS machine has. So measurement is never
     automatic: it warns, and only changes the font size when asked. The
     result is stored in state like any other setting, keeping the concept
     self-describing.
     ====================================================================== */

  /* Measures an arbitrary string. Kept generic so the tagline is checked by
     exactly the same code path as the name — an earlier version measured
     only the primary text field and silently let taglines run off the edge. */
  function measureString(text, fontId, size, spacing, weight) {
    var textNode = byId('measure-text');
    if (!textNode || !text) return 0;
    var stack = findFontStack(fontId) || FONT_STACKS[0];

    textNode.setAttribute('font-family', stack.stack);
    textNode.setAttribute('font-size', String(size));
    textNode.setAttribute('font-weight', String(weight || 700));
    textNode.setAttribute('letter-spacing', String(spacing));
    textNode.textContent = text;

    try { return textNode.getComputedTextLength(); } catch (err) { return 0; }
  }

  function measureTextWidth(ctx, sizeOverride) {
    return measureString(
      ctx.rawText, state.fontFamily,
      (sizeOverride === undefined) ? ctx.fontSize : sizeOverride,
      ctx.letterSpacing, 700
    );
  }

  function measureTagline(ctx, sizeOverride) {
    return measureString(
      ctx.rawTagline, state.secondaryFontFamily,
      (sizeOverride === undefined) ? ctx.taglineFontSize : sizeOverride,
      ctx.taglineLetterSpacing, 500
    );
  }

  /* How wide the text may be, per style. */
  function maxTextWidth(ctx) {
    var s = ctx.state;
    if (ctx.style === 'monogram') {
      return clamp(Math.min(ctx.w, ctx.h) * (s.iconSize / 100), 60, ctx.w) * 0.66;
    }
    if (ctx.style === 'badge') {
      var R = clamp(Math.min(ctx.w, ctx.h) * (s.iconSize / 100), 60, ctx.w) / 2;
      var inner = s.badgeInnerRing
        ? Math.max(6, R - s.borderThickness - s.badgeRingGap)
        : R - s.borderThickness;
      return Math.max(20, inner * 2 * 0.74);
    }
    if (ctx.style === 'wordmark') return ctx.w - 180;
    if (ctx.style === 'lockup') {
      if (s.lockupArrangement === 'stacked') return ctx.w - 120;
      var markSize = ctx.h * 0.80;
      return Math.max(60, ctx.w - (48 + markSize + s.lockupGap) - 48);
    }
    return 0;
  }

  function updateOverflowWarning() {
    var box = byId('overflow-warning');
    if (!box) return;

    var ctx = normalizeState(state);
    if (!STYLES[state.style].textKey) { box.hidden = true; return; }

    var messages = [];

    if (!ctx.rawText) {
      messages.push('This style needs text, but the ' +
        (STYLES[state.style].textKey === 'initials' ? 'Initials' : 'Main logo text') +
        ' field is empty.');
    } else {
      var measured = measureTextWidth(ctx);
      var limit = maxTextWidth(ctx);
      if (measured > 0 && limit > 0 && measured > limit) {
        var over = Math.round(((measured / limit) - 1) * 100);
        messages.push('The text is about ' + over + '% too wide for this canvas and will ' +
          'run past the edge. Press <strong>Fit text to canvas</strong>, reduce the font ' +
          'size, or shorten the text.');
      }
    }

    if (ctx.style === 'lockup' && ctx.rawTagline) {
      var tagLimit = maxTextWidth(ctx);
      var tagWidth = measureTagline(ctx);
      if (tagWidth > 0 && tagLimit > 0 && tagWidth > tagLimit) {
        messages.push('The <strong>tagline</strong> is too wide and will run past the edge. ' +
          '<strong>Fit text to canvas</strong> shrinks the tagline as well as the name.');
      }
    }

    var heightCap = heightCapForFont(ctx);
    if (isFinite(heightCap) && state.fontSize > heightCap) {
      messages.push('The font size is tall enough that this composition may be clipped ' +
                    'at the top or bottom of the canvas. <strong>Fit text to canvas</strong> ' +
                    'accounts for height as well as width.');
    }

    if (messages.length) { box.innerHTML = messages.join('<br>'); box.hidden = false; }
    else { box.hidden = true; }
  }

  /* The largest font size the canvas can accommodate VERTICALLY, or
     Infinity where height is not the binding constraint. Fitting on width
     alone is what let a stacked lockup grow until it ran off the bottom. */
  function heightCapForFont(ctx) {
    var s = ctx.state;
    if (ctx.style === 'wordmark') return ctx.h * 0.55;
    if (ctx.style === 'lockup' && s.lockupArrangement === 'stacked') {
      var markSize = ctx.h * 0.46;
      var tagH = ctx.tagline ? ctx.taglineFontSize * 1.6 : 0;
      var available = ctx.h - 40 - markSize - (s.lockupGap * 0.5) - tagH;
      return Math.max(NUMERIC_RANGES.fontSize[0], available);
    }
    return Infinity;
  }

  /* Bisection, not arithmetic.

     Rendered width is NOT proportional to font size: letter spacing adds a
     fixed amount per character that does not shrink when the font shrinks,
     so scaling by (limit / measured) overshoots on long text and leaves it
     still overflowing. Measuring at each candidate size is correct for any
     font and any spacing. */
  function fitTextToCanvas(silent) {
    var ctx = normalizeState(state);
    if (!STYLES[state.style].textKey) return;

    if (!ctx.rawText) {
      if (!silent) setStatus('There is no text to fit. Type something into the text field first.', 'error');
      return;
    }

    var limit = maxTextWidth(ctx);
    if (!limit || !measureTextWidth(ctx)) {
      if (!silent) setStatus('This browser could not measure the text. Adjust the font size by hand.', 'error');
      return;
    }

    var range = NUMERIC_RANGES.fontSize;
    var lo = range[0], hi = range[1], best = null;

    if (measureTextWidth(ctx, lo) > limit) {
      state.fontSize = lo;
      applyStateToControls();
      render();
      if (!silent) setStatus('This text is too long to fit even at the smallest font size. ' +
                             'Shorten the text, or increase the icon size to give it more room.', 'error');
      return;
    }

    for (var step = 0; step < 20 && lo <= hi; step++) {
      var mid = Math.floor((lo + hi) / 2);
      if (measureTextWidth(ctx, mid) <= limit) { best = mid; lo = mid + 1; }
      else { hi = mid - 1; }
    }

    var fitted = best === null ? range[0] : best;

    /* Width is only half the problem: cap by the vertical budget too, so
       "fit to canvas" means the whole canvas. */
    var heightCap = heightCapForFont(ctx);
    var cappedByHeight = false;
    if (isFinite(heightCap) && fitted > heightCap) {
      fitted = Math.max(range[0], Math.floor(heightCap));
      cappedByHeight = true;
    }

    var grew = fitted > state.fontSize;
    state.fontSize = fitted;

    /* The tagline has its own font, size and spacing, so it needs its own
       fit. Same bisection, same width budget. */
    var taglineFitted = null;
    if (ctx.style === 'lockup' && ctx.rawTagline && measureTagline(ctx) > limit) {
      var tRange = NUMERIC_RANGES.taglineFontSize;
      var tLo = tRange[0], tHi = tRange[1], tBest = null;
      for (var tStep = 0; tStep < 20 && tLo <= tHi; tStep++) {
        var tMid = Math.floor((tLo + tHi) / 2);
        if (measureTagline(ctx, tMid) <= limit) { tBest = tMid; tLo = tMid + 1; }
        else { tHi = tMid - 1; }
      }
      taglineFitted = tBest === null ? tRange[0] : tBest;
      state.taglineFontSize = taglineFitted;
    }

    applyStateToControls();
    render();
    if (!silent) {
      pushHistory('fit');
      setStatus('Font size set to ' + fitted + ', the largest size that fits this canvas' +
                (cappedByHeight ? ' (limited by height, not width)'
                                : (grew ? ' (the text had room to grow)' : '')) +
                (taglineFitted !== null ? ', and the tagline to ' + taglineFitted : '') +
                '. Saved with the concept like any other setting.', 'ok');
    }
  }


  /* ======================================================================
     §12  EXPORT — SVG, PNG, brand kit
     ====================================================================== */

  function baseFilename() { return slugify(state.creatorName) + '-logo'; }

  /* Single download path, with the raw-text fallback for browsers that
     block downloads from file:// pages. */
  function downloadBlob(blob, filename, onFail) {
    try {
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return true;
    } catch (err) {
      if (onFail) onFail(err);
      return false;
    }
  }

  function downloadSVG() {
    var filename = baseFilename() + '.svg';
    /* The exported bytes are currentSVG itself — no regeneration, no canvas,
       no conversion step that could introduce a difference. */
    var blob = new Blob([currentSVG], { type: 'image/svg+xml;charset=utf-8' });
    var ok = downloadBlob(blob, filename);
    if (ok) {
      setStatus('Downloaded ' + filename + '.', 'ok');
    } else {
      var details = document.querySelector('.raw-svg');
      if (details) details.open = true;
      var textarea = byId('raw-svg-text');
      if (textarea) { textarea.focus(); textarea.select(); }
      setStatus('This browser blocked the download. The SVG code has been opened and ' +
                'selected below — copy it and save it as ' + filename + '.', 'error');
    }
  }

  /* --- Rasterisation ----------------------------------------------------
     The SVG is handed to an <img> as a data URI (not a blob URL, which some
     file:// contexts treat as cross-origin and which would taint the canvas
     and make toBlob throw). Same-origin data URIs do not taint.

     HONEST LIMIT: a PNG is NOT deterministic across machines. Text is
     rasterised with whatever font that computer resolves from the stack, so
     the same state can produce different pixels elsewhere. The SVG remains
     the canonical, reproducible artefact. */
  function rasterize(svgString, scale) {
    return new Promise(function (resolve, reject) {
      var def = STYLES[state.style];
      var uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      var img = new Image();

      img.onload = function () {
        try {
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(def.w * scale);
          canvas.height = Math.round(def.h * scale);
          var c2d = canvas.getContext('2d');
          c2d.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            blob ? resolve(blob) : reject(new Error('toBlob returned nothing'));
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = function () { reject(new Error('The SVG could not be loaded for rasterising')); };
      img.src = uri;
    });
  }

  function exportPNG() {
    var scale = Number((byId('pngScale') || {}).value || 2);
    setStatus('Rendering PNG…');
    rasterize(currentSVG, scale).then(function (blob) {
      var def = STYLES[state.style];
      var filename = baseFilename() + '@' + scale + 'x.png';
      if (downloadBlob(blob, filename)) {
        setStatus('Downloaded ' + filename + ' (' + Math.round(def.w * scale) + '×' +
                  Math.round(def.h * scale) + ' pixels). The SVG stays the reproducible ' +
                  'master — a PNG bakes in this machine’s fonts.', 'ok');
      } else {
        setStatus('The PNG was created but this browser blocked the download.', 'error');
      }
    }).catch(function (err) {
      setStatus('PNG export failed: ' + err.message + '. The SVG export still works.', 'error');
    });
  }

  /* --- Minimal ZIP writer (STORE, no compression) ------------------------
     A brand kit is several files, and browsers handle several sequential
     downloads badly. A store-only ZIP is about a hundred lines, needs no
     dependency, and produces a file every operating system opens natively.
     Compression is skipped deliberately: SVG and JSON are small, and DEFLATE
     would be several hundred more lines for no useful gain. */
  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function zipStore(entries) {
    var encoder = new TextEncoder();
    var now = new Date();
    var dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    var locals = [], centrals = [], offset = 0;

    entries.forEach(function (entry) {
      var nameBytes = encoder.encode(entry.name);
      var data = entry.data;
      var crc = crc32(data);

      var local = new Uint8Array(30 + nameBytes.length + data.length);
      var lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);   // UTF-8 filename flag
      lv.setUint16(8, 0, true);        // method 0 = stored
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      local.set(data, 30 + nameBytes.length);
      locals.push(local);

      var central = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint32(42, offset, true);
      central.set(nameBytes, 46);
      centrals.push(central);

      offset += local.length;
    });

    var centralSize = centrals.reduce(function (sum, c) { return sum + c.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    return new Blob(locals.concat(centrals, [end]), { type: 'application/zip' });
  }

  /* Palette sheet as its own SVG — same purity rules, no ids. */
  function buildPaletteSVG(s) {
    var slots = [
      ['Primary', s.primaryColor], ['Secondary', s.secondaryColor],
      ['Accent', s.accentColor], ['Background', s.backgroundColor]
    ];
    var stack = escapeXml((findFontStack('grotesque') || FONT_STACKS[0]).stack);
    var parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 260" ' +
                 'width="800" height="260" role="img">',
                 '  <title>' + escapeXml(s.creatorName) + ' — palette</title>',
                 '  ' + rect(0, 0, 800, 260, 0, fillAttr('#ffffff'))];

    slots.forEach(function (slot, i) {
      var x = 30 + i * 190;
      parts.push('  ' + rect(x, 30, 160, 130, 12, fillAttr(slot[1]) +
                             ' stroke="#dfe3e8" stroke-width="1"'));
      parts.push('  ' + svgText({ text: escapeXml(slot[0]), x: x + 80, centreY: 185,
        fontFamily: stack, fontSize: 18, letterSpacing: 0, weight: 600,
        anchor: 'middle', fill: '#1f2430' }));
      parts.push('  ' + svgText({ text: escapeXml(slot[1].toUpperCase()), x: x + 80, centreY: 213,
        fontFamily: stack, fontSize: 16, letterSpacing: 1, weight: 400,
        anchor: 'middle', fill: '#5c6675' }));
    });

    parts.push('</svg>');
    return parts.join('\n');
  }

  function buildBrandReadme(s) {
    var primaryFont = findFontStack(s.fontFamily) || FONT_STACKS[0];
    var secondFont = findFontStack(s.secondaryFontFamily) || FONT_STACKS[0];
    return [
      (s.creatorName || 'Untitled') + ' — brand kit',
      'Generated by Logo Lab on ' + new Date().toLocaleString(),
      '',
      'FILES',
      '  logo.svg             The master artwork. Reproducible anywhere.',
      '  logo-monochrome.svg  Single-colour version for stamps, embroidery, faxes.',
      '  logo-outline.svg     Stroke-only version for engraving or line art.',
      '  logo.png             Raster preview at 4x. See the note below.',
      '  palette.svg          Colour swatch sheet with hex values.',
      '  brand.json           Full machine-readable settings. Re-importable.',
      '',
      'COLOURS',
      '  Primary      ' + s.primaryColor.toUpperCase(),
      '  Secondary    ' + s.secondaryColor.toUpperCase(),
      '  Accent       ' + s.accentColor.toUpperCase(),
      '  Background   ' + s.backgroundColor.toUpperCase(),
      '',
      'TYPE',
      '  Primary    ' + primaryFont.label,
      '             ' + primaryFont.stack,
      '  Secondary  ' + secondFont.label,
      '             ' + secondFont.stack,
      '',
      'IMPORTANT NOTES',
      '  1. The SVG references font NAMES, not font data. A machine without',
      '     the font substitutes another one. Before sending anything to a',
      '     printer, open the SVG in a design program and convert the text to',
      '     outlines.',
      '  2. The PNG is not reproducible across machines: it bakes in whatever',
      '     font this computer resolved. Treat the SVG as the master.',
      '  3. brand.json can be re-imported into Logo Lab to keep editing.',
      ''
    ].join('\n');
  }

  function exportBrandKit() {
    var encoder = new TextEncoder();
    var s = cloneState(state);

    /* Variants are produced by building from a MODIFIED STATE, not by
       post-processing the string — the one-state-one-string rule holds for
       every file in the kit. */
    var monoState = cloneState(s); monoState.monochrome = true;
    var outlineState = cloneState(s); outlineState.renderMode = 'outline';

    var brandJson = {
      app: 'logo-lab',
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      creator: s.creatorName,
      style: STYLES[s.style].label,
      palette: {
        primary: s.primaryColor, secondary: s.secondaryColor,
        accent: s.accentColor, background: s.backgroundColor
      },
      fonts: {
        primary: findFontStack(s.fontFamily),
        secondary: findFontStack(s.secondaryFontFamily)
      },
      state: s
    };

    var entries = [
      { name: 'logo.svg',            data: encoder.encode(currentSVG) },
      { name: 'logo-monochrome.svg', data: encoder.encode(buildSVG(monoState)) },
      { name: 'logo-outline.svg',    data: encoder.encode(buildSVG(outlineState)) },
      { name: 'palette.svg',         data: encoder.encode(buildPaletteSVG(s)) },
      { name: 'brand.json',          data: encoder.encode(JSON.stringify(brandJson, null, 2)) },
      { name: 'README.txt',          data: encoder.encode(buildBrandReadme(s)) }
    ];

    setStatus('Building brand kit…');

    /* The PNG is best-effort: if rasterising fails the kit still ships. */
    rasterize(currentSVG, 4)
      .then(function (blob) { return blob.arrayBuffer(); })
      .then(function (buffer) {
        entries.splice(3, 0, { name: 'logo.png', data: new Uint8Array(buffer) });
        return true;
      })
      .catch(function () { return false; })
      .then(function (withPng) {
        var zip = zipStore(entries);
        var filename = slugify(s.creatorName) + '-brand-kit.zip';
        if (downloadBlob(zip, filename)) {
          setStatus('Downloaded ' + filename + ' — ' + entries.length + ' files' +
                    (withPng ? '' : ' (PNG skipped: this browser could not rasterise)') + '.', 'ok');
        } else {
          setStatus('The brand kit was built but this browser blocked the download.', 'error');
        }
      });
  }


  /* ======================================================================
     §13  COLOUR HARMONISER AND RANDOMISER
     ====================================================================== */

  function applyHarmony() {
    var base = (byId('harmonyBase') || {}).value || state.primaryColor;
    var scheme = (byId('harmonyScheme') || {}).value || 'complementary';
    var dark = !!(byId('harmonyDark') || {}).checked;

    var palette = harmonise(base, scheme, dark);
    state.primaryColor = palette.primaryColor;
    state.secondaryColor = palette.secondaryColor;
    state.accentColor = palette.accentColor;
    state.backgroundColor = palette.backgroundColor;
    state.gradientTo = palette.accentColor;
    /* Adaptive contrast on: a harmonised palette can place the knockout
       colour anywhere on the lightness scale, so letting it be chosen by
       measured contrast is the only way to guarantee legibility. */
    state.autoContrast = true;

    applyStateToControls();
    render();
    pushHistory('harmony');

    var ratio = contrastRatio(state.primaryColor, normalizeState(state).colors.contrastText);
    setStatus('Applied a ' + scheme + ' palette. Knockout contrast ratio ' +
              ratio.toFixed(1) + ':1' + (ratio < 4.5 ? ' — low, consider a darker primary.' : '.'),
              ratio < 4.5 ? 'error' : 'ok');
  }

  function randomizeConcept() {
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
    function rnd(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

    state.style = pick(ENUMS.style);

    var palette = harmonise(hslToHex(rnd(0, 359), 0.62, 0.5),
                            pick(HARMONY_SCHEMES).id, Math.random() < 0.3);
    state.primaryColor = palette.primaryColor;
    state.secondaryColor = palette.secondaryColor;
    state.accentColor = palette.accentColor;
    state.backgroundColor = palette.backgroundColor;
    state.gradientTo = palette.accentColor;
    state.autoContrast = true;

    state.fontFamily = pick(FONT_STACKS).id;
    state.secondaryFontFamily = pick(FONT_STACKS).id;
    state.letterSpacing = rnd(-4, 22);

    state.iconSize = rnd(56, 92);
    state.borderThickness = rnd(0, 26);
    state.cornerRadius = rnd(0, 120);

    state.symbolSides = rnd(3, 10);
    state.symbolRotation = rnd(0, 180);
    state.symbolInnerScale = rnd(0, 70);

    /* The orbit seed is stored, so a randomised orbit mark is fully
       described by its state and rebuilds identically forever. */
    state.orbitSeed = rnd(0, 999);
    state.orbitNodes = rnd(3, 10);
    state.orbitSpread = rnd(40, 90);
    state.orbitDotScale = rnd(10, 45);
    state.orbitSpokes = Math.random() < 0.75;

    state.avatarHeadWidth = rnd(70, 120);
    state.avatarHeadHeight = rnd(70, 120);
    state.avatarEyeSize = rnd(5, 20);
    state.avatarEyeSpacing = rnd(24, 66);
    state.avatarEars = pick(ENUMS.avatarEars);
    state.avatarMouth = pick(ENUMS.avatarMouth);

    state.lockupMark = pick(MARK_STYLES);
    state.lockupArrangement = pick(ENUMS.lockupArrangement);
    state.lockupGap = rnd(20, 120);

    state.renderMode = Math.random() < 0.18 ? 'outline' : 'solid';
    state.gradientEnabled = Math.random() < 0.4;
    state.gradientBands = rnd(10, 40);

    applyStateToControls();
    render();
    fitTextToCanvas(true);          // silent: keeps text inside the canvas
    applyStateToControls();
    render();
    pushHistory('randomize');
    setStatus('Randomised concept: ' + STYLES[state.style].label +
              '. Press Undo to go back, or Save to keep it.', 'ok');
  }


  /* ======================================================================
     §14  GALLERY, SEARCH AND JSON BACKUP
     ====================================================================== */

  var gallery = [];            // in-memory copy, always authoritative
  var storageWorks = true;     // false -> session-only, warning shown
  var pendingImport = null;    // concepts awaiting merge/replace choice
  var gallerySearch = '';

  function probeStorage() {
    try {
      var probe = '__logolab_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (err) { return false; }
  }

  function loadGallery() {
    if (!storageWorks) return [];
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isUsableConcept) : [];
    } catch (err) {
      setGalleryStatus('Saved concepts could not be read and were ignored. ' +
                       'The stored data may be damaged.', 'error');
      return [];
    }
  }

  function persistGallery() {
    if (!storageWorks) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
      return true;
    } catch (err) {
      setGalleryStatus('Could not save to this browser. Storage may be full or blocked. ' +
                       'Export a JSON backup so this work is not lost.', 'error');
      return false;
    }
  }

  function isUsableConcept(item) {
    return !!item && typeof item === 'object' && typeof item.id === 'string' &&
           (typeof item.svg === 'string' || (item.state && typeof item.state === 'object'));
  }

  function saveConcept() {
    var suggested = STYLES[state.style].label + ' — ' +
      new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    var name = window.prompt('Name this concept:', suggested);
    if (name === null) return;
    name = name.trim() || suggested;

    gallery.unshift({
      id: uid(),
      name: name.slice(0, 80),
      savedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      state: cloneState(state),
      svg: currentSVG
    });

    var saved = persistGallery();
    renderGallery();
    setGalleryStatus(saved
      ? 'Saved "' + name + '" to the gallery.'
      : 'Saved "' + name + '" for this session only — it will be lost when you close the tab.',
      saved ? 'ok' : 'error');
  }

  function loadConcept(id) {
    var concept = null;
    for (var i = 0; i < gallery.length; i++) {
      if (gallery[i].id === id) { concept = gallery[i]; break; }
    }
    if (!concept) return;

    /* Rebuild from the saved SETTINGS, not the saved picture, so renderer
       improvements reach older concepts. The picture is the fallback. */
    var restored = sanitiseState(concept.state);

    if (restored) {
      state = restored;
      applyStateToControls();
      render();
      pushHistory('load');
      var migrated = (concept.schemaVersion || 1) < SCHEMA_VERSION;
      setGalleryStatus('Loaded "' + concept.name + '". Rebuilt from its saved settings' +
        (migrated ? ', and upgraded from an older version of the app' : '') +
        ', so it may differ slightly from the thumbnail if a drawing style has ' +
        'been improved since.', 'ok');
    } else if (typeof concept.svg === 'string' && concept.svg) {
      /* Settings unreadable: show the stored artwork so the work is not
         lost, but be honest that the controls no longer match it. */
      currentSVG = concept.svg;
      paintPreviews();
      setGalleryStatus('The saved settings for "' + concept.name + '" could not be read. ' +
        'The stored picture is shown instead, but the controls no longer match it. ' +
        'Download it now if you want to keep it.', 'error');
    } else {
      setGalleryStatus('"' + concept.name + '" could not be loaded.', 'error');
    }
  }

  function deleteConcept(id) {
    var index = -1;
    for (var i = 0; i < gallery.length; i++) {
      if (gallery[i].id === id) { index = i; break; }
    }
    if (index === -1) return;

    var name = gallery[index].name;
    if (!window.confirm('Delete the concept "' + name + '"? This cannot be undone.')) return;

    gallery.splice(index, 1);
    persistGallery();
    renderGallery();
    setGalleryStatus('Deleted "' + name + '".');
  }

  /* Search matches the concept name and its style label. */
  function matchesSearch(concept) {
    if (!gallerySearch) return true;
    var styleLabel = (concept.state && STYLES[concept.state.style])
      ? STYLES[concept.state.style].label : '';
    return ((concept.name || '') + ' ' + styleLabel).toLowerCase()
      .indexOf(gallerySearch) !== -1;
  }

  function renderGallery() {
    var list = byId('gallery-list');
    var empty = byId('gallery-empty');
    var count = byId('gallery-count');
    list.innerHTML = '';

    var visible = gallery.filter(matchesSearch);

    if (count) {
      count.textContent = gallery.length
        ? (gallerySearch
            ? visible.length + ' of ' + gallery.length + ' shown'
            : gallery.length + ' saved')
        : '';
    }

    if (!gallery.length) {
      empty.hidden = false;
      empty.innerHTML = '<p><strong>No concepts saved yet.</strong></p>' +
        '<p>Adjust the controls until you like something, then press <em>Save</em> at the top ' +
        'of the page. Save several rough ideas rather than trying to perfect one. ' +
        'The <em>Randomize</em> button is a fast way to find a starting point.</p>';
    } else if (!visible.length) {
      empty.hidden = false;
      empty.innerHTML = '<p><strong>No concepts match “' +
        escapeXml(gallerySearch) + '”.</strong></p><p>Clear the search box to see all ' +
        gallery.length + ' saved concepts.</p>';
    } else {
      empty.hidden = true;
    }

    visible.forEach(function (concept) {
      var item = document.createElement('li');
      item.className = 'concept';

      var thumb = document.createElement('div');
      thumb.className = 'concept__thumb';
      /* The thumbnail is the artwork exactly as saved. No ids in the
         artwork means many inline copies on one page stay safe. */
      thumb.innerHTML = typeof concept.svg === 'string' ? concept.svg : '';

      var body = document.createElement('div');
      body.className = 'concept__body';

      var name = document.createElement('p');
      name.className = 'concept__name';
      name.textContent = concept.name || 'Untitled concept';

      var meta = document.createElement('p');
      meta.className = 'concept__meta';
      var styleLabel = concept.state && STYLES[concept.state.style]
        ? STYLES[concept.state.style].label : 'Unknown style';
      meta.textContent = styleLabel + ' • saved ' + formatTimestamp(concept.savedAt) +
        ((concept.schemaVersion || 1) < SCHEMA_VERSION ? ' • older version' : '');

      var actions = document.createElement('div');
      actions.className = 'concept__actions';

      var loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'btn btn--small';
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', function () { loadConcept(concept.id); });

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn--small btn--danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function () { deleteConcept(concept.id); });

      actions.appendChild(loadBtn);
      actions.appendChild(deleteBtn);
      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(actions);
      item.appendChild(thumb);
      item.appendChild(body);
      list.appendChild(item);
    });
  }

  function exportGalleryJSON() {
    if (!gallery.length) {
      setGalleryStatus('There is nothing to export yet. Save a concept first.', 'error');
      return;
    }
    var payload = {
      app: 'logo-lab',
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      concepts: gallery
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    if (downloadBlob(blob, slugify(state.creatorName) + '-logo-gallery.json')) {
      setGalleryStatus('Exported ' + gallery.length + ' concept' +
                       (gallery.length === 1 ? '' : 's') + ' as JSON.', 'ok');
    } else {
      setGalleryStatus('This browser blocked the download, so the backup file could not be created.', 'error');
    }
  }

  /* Validates an imported file and says precisely what is wrong, rather
     than failing generically. Accepts both v1 and v2 backups. */
  function handleImportFile(file) {
    var reader = new FileReader();
    reader.onerror = function () { setGalleryStatus('The file could not be read.', 'error'); };

    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (err) {
        setGalleryStatus('That file is not valid JSON, so it cannot be imported.', 'error');
        return;
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setGalleryStatus('That file is not a Logo Lab backup.', 'error'); return;
      }
      if (parsed.app !== 'logo-lab') {
        setGalleryStatus('That file is valid JSON but was not created by Logo Lab.', 'error'); return;
      }

      /* A single-concept brand.json is also accepted, so a brand kit can be
         imported straight back into the gallery. */
      var incoming = parsed.concepts;
      if (!Array.isArray(incoming)) {
        if (parsed.state && typeof parsed.state === 'object') {
          incoming = [{
            id: uid(),
            name: (parsed.creator || 'Imported') + ' — brand kit',
            savedAt: parsed.exportedAt || new Date().toISOString(),
            state: parsed.state
          }];
        } else {
          setGalleryStatus('That backup file has no list of concepts in it.', 'error'); return;
        }
      }

      var accepted = [], skipped = 0;

      incoming.forEach(function (raw) {
        if (!isUsableConcept(raw)) {
          if (raw && raw.state) { raw.id = uid(); } else { skipped++; return; }
        }
        var cleanState = sanitiseState(raw.state);
        if (!cleanState && typeof raw.svg !== 'string') { skipped++; return; }

        accepted.push({
          id: typeof raw.id === 'string' ? raw.id : uid(),
          name: typeof raw.name === 'string' ? raw.name.slice(0, 80) : 'Imported concept',
          savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
          schemaVersion: SCHEMA_VERSION,
          state: cleanState || cloneState(DEFAULT_STATE),
          svg: typeof raw.svg === 'string' ? raw.svg : (cleanState ? buildSVG(cleanState) : '')
        });
      });

      if (!accepted.length) {
        setGalleryStatus('No usable concepts were found in that file' +
                         (skipped ? ' (' + skipped + ' were unreadable).' : '.'), 'error');
        return;
      }

      pendingImport = accepted;
      byId('import-summary').textContent =
        'Found ' + accepted.length + ' concept' + (accepted.length === 1 ? '' : 's') +
        (parsed.version && parsed.version < SCHEMA_VERSION ? ' from an older version' : '') +
        (skipped ? ' (' + skipped + ' skipped because they were unreadable)' : '') +
        '. You currently have ' + gallery.length + ' saved. Merge them in, or replace ' +
        'everything you have with the file?';
      byId('import-panel').hidden = false;
      setGalleryStatus('');
    };

    reader.readAsText(file);
  }

  function finishImport(mode) {
    if (!pendingImport) return;

    if (mode === 'replace') {
      gallery = pendingImport.slice();
    } else {
      /* Merge: an incoming concept whose id clashes gets a fresh one, so
         nothing silently overwrites existing work. */
      var existingIds = {};
      gallery.forEach(function (c) { existingIds[c.id] = true; });
      pendingImport.forEach(function (c) {
        if (existingIds[c.id]) c.id = uid();
        gallery.unshift(c);
      });
    }

    var count = pendingImport.length;
    pendingImport = null;
    byId('import-panel').hidden = true;
    persistGallery();
    renderGallery();
    setGalleryStatus((mode === 'replace' ? 'Replaced the gallery with ' : 'Merged in ') +
                     count + ' concept' + (count === 1 ? '' : 's') + '.', 'ok');
  }

  function clearGallery() {
    gallery = [];
    if (storageWorks) {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (err) { /* nothing to do */ }
    }
    renderGallery();
    byId('clear-panel').hidden = true;
    byId('clear-confirm-input').value = '';
    byId('btn-clear-confirm').disabled = true;
    setGalleryStatus('The gallery has been cleared.');
  }


  /* ======================================================================
     §15  APP THEME  (light / dark / system)

     This themes the APPLICATION only. The preview frames keep fixed white
     and near-black backgrounds on purpose: they represent real-world
     surfaces the logo must survive, not the user's interface preference.
     Letting them follow the app theme would destroy their whole purpose.
     ====================================================================== */

  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');

    var select = byId('themeMode');
    if (select) select.value = mode;

    try { window.localStorage.setItem(THEME_KEY, mode); } catch (err) { /* non-fatal */ }
  }

  function initTheme() {
    var stored = 'system';
    try { stored = window.localStorage.getItem(THEME_KEY) || 'system'; } catch (err) { /* non-fatal */ }
    applyTheme(stored);
  }


  /* ======================================================================
     §16  STATUS HELPERS AND INIT
     ====================================================================== */

  function setStatus(message, kind) {
    var el = byId('status-line');
    el.textContent = message || '';
    el.className = 'status' + (kind ? ' is-' + kind : '');
  }

  function setGalleryStatus(message, kind) {
    var el = byId('gallery-status');
    el.textContent = message || '';
    el.className = 'status' + (kind ? ' is-' + kind : '');
  }

  function resetToDefaults() {
    if (!window.confirm('Reset every control back to its starting value? ' +
                        'Saved gallery concepts are not affected.')) return;
    state = cloneState(DEFAULT_STATE);
    applyStateToControls();
    render();
    pushHistory('reset');
    setStatus('Controls reset to their default values.');
  }

  function bindButtons() {
    byId('btn-export-svg').addEventListener('click', downloadSVG);
    byId('btn-export-png').addEventListener('click', exportPNG);
    byId('btn-export-kit').addEventListener('click', exportBrandKit);
    byId('btn-save-concept').addEventListener('click', saveConcept);
    byId('btn-reset').addEventListener('click', resetToDefaults);
    byId('btn-fit-text').addEventListener('click', function () { fitTextToCanvas(false); });
    byId('btn-randomize').addEventListener('click', randomizeConcept);
    byId('btn-harmonize').addEventListener('click', applyHarmony);
    byId('btn-undo').addEventListener('click', undo);
    byId('btn-redo').addEventListener('click', redo);

    byId('themeMode').addEventListener('change', function (e) { applyTheme(e.target.value); });

    byId('gallery-search').addEventListener('input', function (e) {
      gallerySearch = e.target.value.trim().toLowerCase();
      renderGallery();
    });

    byId('btn-export-json').addEventListener('click', exportGalleryJSON);
    byId('btn-import-json').addEventListener('click', function () { byId('import-file').click(); });

    byId('import-file').addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      if (file) handleImportFile(file);
      event.target.value = '';   // allow re-selecting the same file
    });

    byId('btn-import-merge').addEventListener('click', function () { finishImport('merge'); });
    byId('btn-import-replace').addEventListener('click', function () { finishImport('replace'); });
    byId('btn-import-cancel').addEventListener('click', function () {
      pendingImport = null;
      byId('import-panel').hidden = true;
      setGalleryStatus('Import cancelled. Nothing was changed.');
    });

    byId('btn-clear-gallery').addEventListener('click', function () {
      if (!gallery.length) { setGalleryStatus('The gallery is already empty.', 'error'); return; }
      byId('clear-panel').hidden = false;
      byId('clear-confirm-input').focus();
    });

    byId('clear-confirm-input').addEventListener('input', function (event) {
      byId('btn-clear-confirm').disabled = (event.target.value.trim() !== 'DELETE');
    });

    byId('btn-clear-confirm').addEventListener('click', clearGallery);

    byId('btn-clear-cancel').addEventListener('click', function () {
      byId('clear-panel').hidden = true;
      byId('clear-confirm-input').value = '';
      byId('btn-clear-confirm').disabled = true;
      setGalleryStatus('Nothing was deleted.');
    });

    /* Keyboard undo/redo. Deliberately ignored while a text field has
       focus, so the browser's own text undo keeps working there. */
    document.addEventListener('keydown', function (event) {
      if (!(event.ctrlKey || event.metaKey)) return;
      var tag = (event.target.tagName || '').toLowerCase();
      var editing = (tag === 'input' && event.target.type === 'text') || tag === 'textarea';
      if (editing) return;

      var key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      else if ((key === 'z' && event.shiftKey) || key === 'y') { event.preventDefault(); redo(); }
    });
  }

  function init() {
    initTheme();
    buildFontOptions();
    buildPaletteButtons();
    bindControls();
    bindButtons();

    storageWorks = probeStorage();
    if (!storageWorks) byId('storage-warning').hidden = false;

    gallery = loadGallery();
    renderGallery();

    applyStateToControls();
    byId('harmonyBase').value = state.primaryColor;
    render();
    pushHistory('init');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
