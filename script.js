/* ==========================================================================
   LOGO LAB — script.js

   ARCHITECTURE IN ONE PARAGRAPH
   -----------------------------
   Everything you see is derived from one plain object called `state`.
   When anything changes, buildSVG(state) produces ONE string of SVG code
   and stores it in `currentSVG`. That single string is injected into all
   five preview frames and is the exact content of the downloaded file.
   There is no second rendering path, no canvas, and no CSS recreation of
   the logo. What you see is literally what you export.

   DELIBERATE CONSTRAINT: FLAT FILLS ONLY
   --------------------------------------
   The artwork uses no gradients, filters, clip-paths or masks, and contains
   no `id` attributes at all. Those features require reusable IDs, and five
   inline copies of the same ID on one page collide — the browser resolves
   them all to the first copy and the previews start rendering incorrectly.
   Avoiding IDs is what makes it safe to reuse the identical string five
   times. It also produces a stronger logo: flat colour survives a favicon,
   a fax and an embroidery machine.

   SECTIONS
   --------
   §1  CONSTANTS          palettes, font stacks, style definitions
   §2  STATE              defaults, validation, merge-over-defaults
   §3  UTILITIES          escaping, clamping, number formatting, ids
   §4  SVG PRIMITIVES     shared geometry helpers
   §5  STYLE RENDERERS    one function per logo style
   §6  SVG ASSEMBLY       normalizeState + buildSVG  <- the core
   §7  PREVIEW            paints the one string into every frame
   §8  CONTROLS           DOM wiring
   §9  TEXT MEASUREMENT   overflow warning + Fit text button
   §10 EXPORT             SVG download with raw-text fallback
   §11 GALLERY + BACKUP   localStorage, JSON import/export, clear
   §12 INIT               startup
   ========================================================================== */

(function () {
  'use strict';

  /* ======================================================================
     §1  CONSTANTS
     ====================================================================== */

  var SCHEMA_VERSION = 1;
  var STORAGE_KEY = 'logoLab.gallery.v1';

  /* Cross-platform font stacks only. Every stack ends in a generic family
     so it degrades sensibly on any operating system. See the export note in
     the interface: SVG references font NAMES, not font data. */
  var FONT_STACKS = [
    { id: 'grotesque', label: 'Modern sans (system)',  stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
    { id: 'geometric', label: 'Geometric sans',        stack: "'Century Gothic', 'Avant Garde', 'Trebuchet MS', Verdana, Geneva, sans-serif" },
    { id: 'humanist',  label: 'Rounded sans',          stack: "'Trebuchet MS', 'Segoe UI', Tahoma, Verdana, sans-serif" },
    { id: 'serif',     label: 'Classic serif',         stack: "Georgia, 'Times New Roman', Times, serif" },
    { id: 'elegant',   label: 'Elegant serif',         stack: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" },
    { id: 'mono',      label: 'Monospace / technical', stack: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', 'Courier New', monospace" },
    { id: 'display',   label: 'Heavy display',         stack: "Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif" }
  ];

  /* Palette presets are a convenience only. They write into the four colour
     fields in state; the preset id itself is NOT stored, so a saved concept
     can never disagree with its own colours. */
  var PALETTES = [
    { name: 'Ink',        primary: '#1b1f3b', secondary: '#4f5bd5', accent: '#f2b705', background: '#ffffff' },
    { name: 'Terminal',   primary: '#0f1a14', secondary: '#1f7a4d', accent: '#8ef2b0', background: '#f3f7f4' },
    { name: 'Ember',      primary: '#2b1410', secondary: '#c8442a', accent: '#f6a623', background: '#fdf6ef' },
    { name: 'Paper',      primary: '#2e2a25', secondary: '#8a7f6d', accent: '#b4442f', background: '#f7f3ea' },
    { name: 'Signal',     primary: '#101114', secondary: '#3b82f6', accent: '#f43f5e', background: '#ffffff' },
    { name: 'Deep space', primary: '#12122b', secondary: '#6d5bd0', accent: '#22d3ee', background: '#0e0e1c' },
    { name: 'Studio',     primary: '#232323', secondary: '#6b6b6b', accent: '#d9d9d9', background: '#ffffff' }
  ];

  /* Canvas size and which text field each style uses. Canvases are fixed —
     text does not resize the canvas, which is why an overflow warning and a
     manual Fit text button exist instead of silent auto-fitting. */
  var STYLES = {
    monogram: { label: 'Monogram',          w: 512,  h: 512, textKey: 'initials' },
    badge:    { label: 'Circular badge',    w: 512,  h: 512, textKey: 'initials' },
    symbol:   { label: 'Geometric symbol',  w: 512,  h: 512, textKey: null },
    wordmark: { label: 'Wordmark',          w: 1024, h: 320, textKey: 'logoText' },
    avatar:   { label: 'Geometric avatar',  w: 512,  h: 512, textKey: null }
  };

  /* Which controls actually affect which style. Controls outside this list
     are dimmed and labelled "not used" so nothing appears to do nothing. */
  var STYLE_CONTROLS = {
    monogram: ['fontFamily', 'fontSize', 'letterSpacing', 'iconSize', 'borderThickness', 'cornerRadius'],
    badge:    ['fontFamily', 'fontSize', 'letterSpacing', 'iconSize', 'borderThickness', 'badgeRingGap', 'badgeInnerRing'],
    symbol:   ['iconSize', 'borderThickness', 'cornerRadius', 'symbolSides', 'symbolRotation', 'symbolInnerScale'],
    wordmark: ['fontFamily', 'fontSize', 'letterSpacing', 'borderThickness'],
    avatar:   ['iconSize', 'borderThickness', 'cornerRadius',
               'avatarHeadWidth', 'avatarHeadHeight', 'avatarEyeSize',
               'avatarEyeSpacing', 'avatarEars', 'avatarMouth']
  };

  /* Approximation of the distance from a text element's baseline to the
     visual centre of its capital letters, as a fraction of font size.
     Used INSTEAD of dominant-baseline, which browsers and design programs
     disagree about. An explicit number travels reliably. */
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

    /* which renderer runs */
    style: 'monogram',

    /* colour */
    primaryColor: '#1b1f3b',
    secondaryColor: '#4f5bd5',
    accentColor: '#f2b705',
    backgroundColor: '#ffffff',
    /* On by default. With an opaque background rectangle baked in, the dark
       preview only ever shows a white card and tells you nothing about how
       the mark itself reads on dark. Transparent is also the more useful
       default for a logo that has to sit on top of other things. */
    transparentBackground: true,
    monochrome: false,

    /* type */
    fontFamily: 'grotesque',
    fontSize: 170,
    letterSpacing: 4,

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

    /* geometric avatar */
    avatarHeadWidth: 100,
    avatarHeadHeight: 100,
    avatarEyeSize: 11,
    avatarEyeSpacing: 44,
    avatarEars: 'antenna',
    avatarMouth: 'line'
  };

  /* Numeric controls and their permitted ranges. Used both to clamp live
     input and to sanitise anything loaded from storage or a JSON file. */
  var NUMERIC_RANGES = {
    fontSize:         [20, 300],
    letterSpacing:    [-20, 60],
    iconSize:         [30, 98],
    borderThickness:  [0, 48],
    cornerRadius:     [0, 140],
    badgeRingGap:     [6, 70],
    symbolSides:      [3, 12],
    symbolRotation:   [0, 180],
    symbolInnerScale: [0, 90],
    avatarHeadWidth:  [50, 130],
    avatarHeadHeight: [50, 130],
    avatarEyeSize:    [2, 30],
    avatarEyeSpacing: [10, 80]
  };

  var ENUMS = {
    style: ['monogram', 'badge', 'symbol', 'wordmark', 'avatar'],
    avatarEars: ['none', 'ears', 'antenna'],
    avatarMouth: ['none', 'line', 'smile', 'dot']
  };

  /* The live state. Single source of truth. Never read values back out of
     the DOM — read them from here. */
  var state = cloneState(DEFAULT_STATE);

  /* The one generated SVG string. Every preview and the export use this. */
  var currentSVG = '';

  function cloneState(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* Merge an untrusted object over the defaults. This is what allows a
     concept saved today to still open after new controls are added: any
     field the old concept lacks simply keeps its default value. Returns
     null if the input is not usable at all. */
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
      } else if (key === 'fontFamily') {
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
           key === 'accentColor'  || key === 'backgroundColor';
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
     §3  UTILITIES
     ====================================================================== */

  /* Central XML escaping. Applied once, inside normalizeState, so that no
     individual renderer can forget it. A creator name containing & or < in
     an unescaped SVG produces a malformed file that renders as nothing —
     this is the single most common way a generator like this fails. */
  function escapeXml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /* Tidy number formatting keeps the exported file readable. */
  function n(value) {
    if (!isFinite(value)) return '0';
    return String(Math.round(value * 100) / 100);
  }

  function uid() {
    return 'c_' + Date.now().toString(36) + '_' +
           Math.random().toString(36).slice(2, 7);
  }

  function slugify(text) {
    var slug = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    return slug || 'my';
  }

  function formatTimestamp(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function byId(id) { return document.getElementById(id); }


  /* ======================================================================
     §4  SVG PRIMITIVES
     Shared geometry helpers. Each returns a string of markup. None of them
     emit an id attribute — see the constraint note at the top of the file.
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

  function path(d, attrs) {
    return '<path d="' + d + '" ' + attrs + '/>';
  }

  function line(x1, y1, x2, y2, attrs) {
    return '<line x1="' + n(x1) + '" y1="' + n(y1) +
           '" x2="' + n(x2) + '" y2="' + n(y2) + '" ' + attrs + '/>';
  }

  /* Centred text.

     Two deliberate details:
     1. No dominant-baseline. The vertical position is an explicit y value
        calculated from font size, because design programs handle
        dominant-baseline inconsistently and the export must survive them.
     2. Letter spacing adds trailing space after the final character, which
        drags centred text off-centre by half the spacing. Shifting x by
        +spacing/2 cancels that out. */
  function centredText(ctx, content, centreX, centreY) {
    var x = centreX + (ctx.letterSpacing / 2);
    var y = centreY + (ctx.fontSize * CAP_CENTRE_RATIO);

    return '<text x="' + n(x) + '" y="' + n(y) + '"' +
           ' font-family="' + ctx.fontFamily + '"' +
           ' font-size="' + n(ctx.fontSize) + '"' +
           ' font-weight="700"' +
           ' letter-spacing="' + n(ctx.letterSpacing) + '"' +
           ' text-anchor="middle"' +
           ' fill="' + ctx.colors.contrastText + '">' + content + '</text>';
  }

  /* Regular polygon with genuinely rounded corners.

     Each corner is cut back along both adjoining edges by the radius and
     joined with an arc. Arcs need no ids, so this stays inside the flat-fill
     constraint while still honouring the corner roundness control. */
  function roundedPolygonPath(cx, cy, radius, sides, rotationDeg, cornerR) {
    var points = [];
    var start = (rotationDeg - 90) * Math.PI / 180;
    var i;

    for (i = 0; i < sides; i++) {
      var angle = start + (i * 2 * Math.PI / sides);
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }

    /* Straight corners: a simple polygon path. */
    if (cornerR <= 0.5) {
      var straight = 'M ' + points.map(function (p) {
        return n(p[0]) + ' ' + n(p[1]);
      }).join(' L ');
      return straight + ' Z';
    }

    /* Never round by more than half the shortest edge or the shape inverts. */
    var shortestEdge = Infinity;
    for (i = 0; i < sides; i++) {
      var a = points[i];
      var b = points[(i + 1) % sides];
      shortestEdge = Math.min(shortestEdge, Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    var r = Math.min(cornerR, (shortestEdge / 2) - 0.5);
    if (r <= 0.5) r = 0.5;

    var d = '';
    for (i = 0; i < sides; i++) {
      var prev = points[(i - 1 + sides) % sides];
      var cur  = points[i];
      var next = points[(i + 1) % sides];

      var entry = pointTowards(cur, prev, r);
      var exit  = pointTowards(cur, next, r);

      d += (i === 0 ? 'M ' : ' L ') + n(entry[0]) + ' ' + n(entry[1]);
      d += ' A ' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(exit[0]) + ' ' + n(exit[1]);
    }
    return d + ' Z';
  }

  function pointTowards(from, to, distance) {
    var dx = to[0] - from[0];
    var dy = to[1] - from[1];
    var len = Math.hypot(dx, dy) || 1;
    return [from[0] + (dx / len) * distance, from[1] + (dy / len) * distance];
  }

  function fillAttr(colour) { return 'fill="' + colour + '"'; }

  function strokeAttr(colour, width, extra) {
    return 'fill="none" stroke="' + colour + '" stroke-width="' + n(width) + '"' +
           (extra ? ' ' + extra : '');
  }


  /* ======================================================================
     §5  STYLE RENDERERS

     Each renderer receives the normalized context and returns an array of
     markup strings. Renderers do geometry only — they never escape text,
     never clamp values and never read the DOM. All of that happened in
     normalizeState, so bugs of that kind can only live in one place.
     ====================================================================== */

  var RENDERERS = {};

  /* ---- Monogram: initials on a rounded plate ---- */
  RENDERERS.monogram = function (ctx) {
    var out = [];
    var c = ctx.colors;
    var size = clamp(ctx.w * (ctx.state.iconSize / 100), 60, ctx.w);
    var x = ctx.cx - size / 2;
    var y = ctx.cy - size / 2;
    var bt = ctx.state.borderThickness;
    var rx = Math.min(ctx.state.cornerRadius, size / 2);

    out.push(rect(x, y, size, size, rx, fillAttr(c.primary)));

    if (bt > 0) {
      out.push(rect(
        x + bt / 2, y + bt / 2, size - bt, size - bt,
        Math.max(0, rx - bt / 2),
        strokeAttr(c.accent, bt)
      ));
    }

    out.push(centredText(ctx, ctx.text, ctx.cx, ctx.cy - size * 0.04));

    /* Small supporting bar, so the secondary colour has a role here. */
    var barW = size * 0.30;
    var barH = Math.max(4, bt * 0.55);
    out.push(rect(ctx.cx - barW / 2, ctx.cy + size * 0.22, barW, barH, barH / 2,
                  fillAttr(c.secondary)));
    return out;
  };

  /* ---- Circular badge: initials inside a ringed disc ---- */
  RENDERERS.badge = function (ctx) {
    var out = [];
    var c = ctx.colors;
    var R = clamp(ctx.w * (ctx.state.iconSize / 100), 60, ctx.w) / 2;
    var bt = ctx.state.borderThickness;

    out.push(circle(ctx.cx, ctx.cy, R, fillAttr(c.primary)));

    if (bt > 0) {
      out.push(circle(ctx.cx, ctx.cy, R - bt / 2, strokeAttr(c.secondary, bt)));
    }

    if (ctx.state.badgeInnerRing) {
      var innerR = Math.max(6, R - bt - ctx.state.badgeRingGap);
      out.push(circle(ctx.cx, ctx.cy, innerR,
                      strokeAttr(c.accent, Math.max(2, bt * 0.6))));
    }

    out.push(centredText(ctx, ctx.text, ctx.cx, ctx.cy));
    return out;
  };

  /* ---- Geometric symbol: rounded polygon with a cut-out core ---- */
  RENDERERS.symbol = function (ctx) {
    var out = [];
    var c = ctx.colors;
    var R = clamp(ctx.w * (ctx.state.iconSize / 100), 60, ctx.w) / 2;
    var bt = ctx.state.borderThickness;
    var sides = Math.round(ctx.state.symbolSides);

    /* The corner control is tuned for the large square plate of the monogram.
       Applied at full strength to a polygon it rounds the corners so far that
       a hexagon turns into a flower, so it is scaled down here and capped
       against the shape's own radius. */
    var cornerR = Math.min(ctx.state.cornerRadius * 0.45, R * 0.3);

    var outerD = roundedPolygonPath(
      ctx.cx, ctx.cy, R - bt / 2, sides, ctx.state.symbolRotation, cornerR
    );

    /* The inner shape is a GENUINE hole, not a background-coloured patch on
       top. Both outlines go into one path with fill-rule="evenodd", which
       needs no id and so stays inside the flat-fill constraint. A real hole
       works on any background, which a painted patch does not. */
    var innerScale = ctx.state.symbolInnerScale / 100;
    var d = outerD;
    if (innerScale > 0.02) {
      d += ' ' + roundedPolygonPath(
        ctx.cx, ctx.cy, (R - bt) * innerScale, sides,
        ctx.state.symbolRotation + (180 / sides),
        cornerR * innerScale
      );
    }

    out.push(path(d,
      'fill="' + c.secondary + '" fill-rule="evenodd"' +
      (bt > 0 ? ' stroke="' + c.accent + '" stroke-width="' + n(bt) + '" stroke-linejoin="round"' : '')
    ));
    return out;
  };

  /* ---- Wordmark: the name set as type with rules above and below ---- */
  RENDERERS.wordmark = function (ctx) {
    var out = [];
    var c = ctx.colors;
    var bt = ctx.state.borderThickness;

    if (bt > 0) {
      var kickerW = 140;
      var kickerH = Math.max(3, bt * 0.5);
      out.push(rect(
        ctx.cx - kickerW / 2,
        ctx.cy - ctx.fontSize * 0.55 - 30,
        kickerW, kickerH, kickerH / 2,
        fillAttr(c.secondary)
      ));
    }

    /* The wordmark's own text colour is the primary colour, not the shared
       contrast colour, because it sits directly on the background. */
    out.push(
      '<text x="' + n(ctx.cx + ctx.letterSpacing / 2) +
      '" y="' + n(ctx.cy + ctx.fontSize * CAP_CENTRE_RATIO) + '"' +
      ' font-family="' + ctx.fontFamily + '"' +
      ' font-size="' + n(ctx.fontSize) + '"' +
      ' font-weight="700"' +
      ' letter-spacing="' + n(ctx.letterSpacing) + '"' +
      ' text-anchor="middle"' +
      ' fill="' + c.primary + '">' + ctx.text + '</text>'
    );

    if (bt > 0) {
      var ruleInset = 110;
      out.push(rect(
        ruleInset,
        ctx.cy + ctx.fontSize * 0.42 + 26,
        ctx.w - ruleInset * 2, bt, bt / 2,
        fillAttr(c.accent)
      ));
    }
    return out;
  };

  /* ---- Geometric avatar: an abstract face built from primitives only ----
     No imported artwork, no hand-drawn detail — a rounded head, optional
     ears or antennae, two eyes and an optional mouth. */
  RENDERERS.avatar = function (ctx) {
    var out = [];
    var c = ctx.colors;
    var s = ctx.state;
    var bt = s.borderThickness;

    var base = clamp(ctx.w * (s.iconSize / 100), 60, ctx.w);
    var headW = clamp(base * (s.avatarHeadWidth / 100) * 0.78, 40, ctx.w - 20);
    var headH = clamp(base * (s.avatarHeadHeight / 100) * 0.78, 40, ctx.h - 20);

    /* Nudge the head down slightly when antennae need room above it. */
    var offsetY = (s.avatarEars === 'antenna') ? 18 : 0;
    var hx = ctx.cx - headW / 2;
    var hy = ctx.cy - headH / 2 + offsetY;
    var rx = Math.min(s.cornerRadius, Math.min(headW, headH) / 2);

    /* Ears and antennae are drawn FIRST so the head overlaps them. */
    if (s.avatarEars === 'ears') {
      var earR = headW * 0.14;
      out.push(circle(hx, hy + headH * 0.34, earR, fillAttr(c.secondary)));
      out.push(circle(hx + headW, hy + headH * 0.34, earR, fillAttr(c.secondary)));
    } else if (s.avatarEars === 'antenna') {
      var stemW = Math.max(3, bt * 0.5);
      var tipR = Math.max(5, bt * 0.7);
      var stemAttrs = 'stroke="' + c.secondary + '" stroke-width="' + n(stemW) +
                      '" stroke-linecap="round"';

      out.push(line(ctx.cx - headW * 0.20, hy + 10,
                    ctx.cx - headW * 0.34, hy - 44, stemAttrs));
      out.push(circle(ctx.cx - headW * 0.34, hy - 44, tipR, fillAttr(c.secondary)));

      out.push(line(ctx.cx + headW * 0.20, hy + 10,
                    ctx.cx + headW * 0.34, hy - 44, stemAttrs));
      out.push(circle(ctx.cx + headW * 0.34, hy - 44, tipR, fillAttr(c.secondary)));
    }

    /* Head */
    out.push(rect(hx, hy, headW, headH, rx, fillAttr(c.primary)));
    if (bt > 0) {
      out.push(rect(hx + bt / 2, hy + bt / 2, headW - bt, headH - bt,
                    Math.max(0, rx - bt / 2), strokeAttr(c.accent, bt)));
    }

    /* Eyes */
    var eyeR = Math.max(2, headW * (s.avatarEyeSize / 100) * 0.5);
    var eyeDX = headW * (s.avatarEyeSpacing / 100) * 0.5;
    var eyeY = hy + headH * 0.42;
    out.push(circle(ctx.cx - eyeDX, eyeY, eyeR, fillAttr(c.contrastText)));
    out.push(circle(ctx.cx + eyeDX, eyeY, eyeR, fillAttr(c.contrastText)));

    /* Mouth */
    var mouthY = hy + headH * 0.70;
    if (s.avatarMouth === 'line') {
      var mw = headW * 0.28;
      var mh = Math.max(3, bt * 0.5);
      out.push(rect(ctx.cx - mw / 2, mouthY - mh / 2, mw, mh, mh / 2,
                    fillAttr(c.contrastText)));
    } else if (s.avatarMouth === 'smile') {
      var half = headW * 0.16;
      var arcR = headW * 0.22;
      /* Sweep flag 0 curves the arc downwards in SVG's y-down coordinates. */
      var d = 'M ' + n(ctx.cx - half) + ' ' + n(mouthY) +
              ' A ' + n(arcR) + ' ' + n(arcR) + ' 0 0 0 ' +
              n(ctx.cx + half) + ' ' + n(mouthY);
      out.push(path(d, strokeAttr(c.contrastText, Math.max(3, bt * 0.55),
                                  'stroke-linecap="round"')));
    } else if (s.avatarMouth === 'dot') {
      out.push(circle(ctx.cx, mouthY, Math.max(3, headW * 0.045),
                      fillAttr(c.contrastText)));
    }
    return out;
  };


  /* ======================================================================
     §6  SVG ASSEMBLY — the core of the application
     ====================================================================== */

  /* Turns raw state into a safe, clamped drawing context. Every value a
     renderer touches passes through here first: text is escaped, numbers
     are clamped, colours are resolved and monochrome is applied. */
  function normalizeState(s) {
    var styleDef = STYLES[s.style] || STYLES.monogram;
    var fontDef = findFontStack(s.fontFamily) || FONT_STACKS[0];

    /* Monochrome is applied HERE, before any shape is drawn, which is what
       makes it a genuinely global toggle: every preview and the export get
       the same treatment because they all come from this one string.
       Marks collapse to the primary colour; anything that sits on top of a
       mark uses the background colour, so contrast is never lost. */
    var colors;
    if (s.monochrome) {
      colors = {
        primary: s.primaryColor,
        secondary: s.primaryColor,
        accent: s.primaryColor,
        background: s.backgroundColor,
        contrastText: s.backgroundColor
      };
    } else {
      colors = {
        primary: s.primaryColor,
        secondary: s.secondaryColor,
        accent: s.accentColor,
        background: s.backgroundColor,
        contrastText: s.backgroundColor
      };
    }

    var rawText = styleDef.textKey ? s[styleDef.textKey] : '';

    return {
      state: s,
      style: s.style,
      w: styleDef.w,
      h: styleDef.h,
      cx: styleDef.w / 2,
      cy: styleDef.h / 2,
      colors: colors,
      fontFamily: escapeXml(fontDef.stack),
      fontSize: s.fontSize,
      letterSpacing: s.letterSpacing,
      text: escapeXml(rawText),
      rawText: rawText,
      title: escapeXml((s.creatorName || 'Untitled') + ' — ' + styleDef.label + ' logo')
    };
  }

  /* Produces the one and only SVG string.

     Note there is no <?xml ... ?> declaration. It is optional for SVG, and
     leaving it out means the identical string can be injected into the page
     with innerHTML and written to the file unchanged. That byte-for-byte
     sameness is the whole point. */
  function buildSVG(s) {
    var ctx = normalizeState(s);
    var renderer = RENDERERS[ctx.style] || RENDERERS.monogram;

    var parts = [];
    parts.push(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + ctx.w + ' ' + ctx.h + '"' +
      ' width="' + ctx.w + '" height="' + ctx.h + '" role="img">'
    );
    /* <title> as the first child provides the accessible name and needs no
       id attribute, which keeps the no-ids rule intact. */
    parts.push('  <title>' + ctx.title + '</title>');

    if (!s.transparentBackground) {
      parts.push('  ' + rect(0, 0, ctx.w, ctx.h, 0, fillAttr(ctx.colors.background)));
    }

    renderer(ctx).forEach(function (markup) {
      parts.push('  ' + markup);
    });

    parts.push('</svg>');
    return parts.join('\n');
  }


  /* ======================================================================
     §7  PREVIEW
     The single-string guarantee, in five lines of code.
     ====================================================================== */

  var previewFrames = null;

  function paintPreviews() {
    if (!previewFrames) {
      previewFrames = document.querySelectorAll('[data-preview]');
    }
    for (var i = 0; i < previewFrames.length; i++) {
      /* The SAME string, every time. The frames differ only in the CSS
         applied to their container: background colour, size and opacity. */
      previewFrames[i].innerHTML = currentSVG;
    }

    var raw = byId('raw-svg-text');
    if (raw) raw.value = currentSVG;

    var meta = byId('svg-meta');
    if (meta) {
      meta.textContent = 'One SVG string • ' +
        currentSVG.length.toLocaleString() + ' characters • ' +
        STYLES[state.style].w + '×' + STYLES[state.style].h + ' canvas • ' +
        'shown in ' + previewFrames.length + ' frames, exported unchanged';
    }
  }

  /* The single place that rebuilds everything after any change. */
  function render() {
    currentSVG = buildSVG(state);
    paintPreviews();
    updateOverflowWarning();
  }


  /* ======================================================================
     §8  CONTROLS
     ====================================================================== */

  function buildFontOptions() {
    var select = byId('fontFamily');
    FONT_STACKS.forEach(function (font) {
      var option = document.createElement('option');
      option.value = font.id;
      option.textContent = font.label;
      select.appendChild(option);
    });
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
        setStatus('Applied the ' + palette.name + ' palette.', 'ok');
      });

      host.appendChild(button);
    });
  }

  /* One generic handler for every control. Each input carries data-key,
     naming the state field it writes to. */
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

    if (key === 'style') {
      updateControlAvailability();
    }
    syncReadouts();
    render();
  }

  function bindControls() {
    var inputs = document.querySelectorAll('[data-key]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('input', onControlInput);
      inputs[i].addEventListener('change', onControlInput);
    }
  }

  /* Pushes state into the DOM. Used at startup, on reset and when a gallery
     concept is loaded. */
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
        /* Explicit class as well as :has(), for older browsers. */
        var wrapper = el.closest('.style-opt');
        if (wrapper) wrapper.classList.toggle('is-selected', el.checked);
      } else {
        el.value = value;
      }
    }
    syncReadouts();
    updateControlAvailability();
  }

  function syncReadouts() {
    var outputs = document.querySelectorAll('[data-readout]');
    for (var i = 0; i < outputs.length; i++) {
      var key = outputs[i].getAttribute('data-readout');
      var value = state[key];
      var suffix = '';
      if (key === 'iconSize' || key === 'symbolInnerScale' ||
          key === 'avatarHeadWidth' || key === 'avatarHeadHeight' ||
          key === 'avatarEyeSize' || key === 'avatarEyeSpacing') {
        suffix = '%';
      } else if (key === 'symbolRotation') {
        suffix = '°';
      } else if (key === 'symbolSides') {
        suffix = ' sides';
      }
      outputs[i].textContent = value + suffix;
    }
  }

  /* Dims controls that the current style ignores, rather than leaving the
     user to discover that a slider does nothing. */
  function updateControlAvailability() {
    var allowed = STYLE_CONTROLS[state.style] || [];

    var fields = document.querySelectorAll('[data-control]');
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i].getAttribute('data-control');
      fields[i].classList.toggle('is-na', allowed.indexOf(key) === -1);
    }

    /* Whole per-style sections only appear for their own style. */
    var groups = document.querySelectorAll('[data-style-group]');
    for (var j = 0; j < groups.length; j++) {
      groups[j].hidden = (groups[j].getAttribute('data-style-group') !== state.style);
    }

    var fitButton = byId('btn-fit-text');
    if (fitButton) fitButton.disabled = !STYLES[state.style].textKey;
  }


  /* ======================================================================
     §9  TEXT MEASUREMENT

     Text width cannot be calculated without asking the browser, and the
     answer depends on which fonts THIS computer has. So measurement is
     never automatic: it warns you, and only changes the font size when you
     press Fit text. The resulting number is then stored in state like any
     other setting, so the concept stays reproducible.
     ====================================================================== */

  function measureTextWidth(ctx, sizeOverride) {
    var svg = byId('measure-svg');
    var textNode = byId('measure-text');
    if (!svg || !textNode || !ctx.rawText) return 0;

    var size = (sizeOverride === undefined) ? ctx.fontSize : sizeOverride;

    textNode.setAttribute('font-family', findFontStack(state.fontFamily).stack);
    textNode.setAttribute('font-size', String(size));
    textNode.setAttribute('font-weight', '700');
    textNode.setAttribute('letter-spacing', String(ctx.letterSpacing));
    textNode.textContent = ctx.rawText;

    try {
      return textNode.getComputedTextLength();
    } catch (err) {
      return 0;
    }
  }

  /* How wide the text is allowed to be, per style. */
  function maxTextWidth(ctx) {
    var s = ctx.state;
    if (ctx.style === 'monogram') {
      return clamp(ctx.w * (s.iconSize / 100), 60, ctx.w) * 0.66;
    }
    if (ctx.style === 'badge') {
      var R = clamp(ctx.w * (s.iconSize / 100), 60, ctx.w) / 2;
      var inner = s.badgeInnerRing
        ? Math.max(6, R - s.borderThickness - s.badgeRingGap)
        : R - s.borderThickness;
      return Math.max(20, inner * 2 * 0.74);
    }
    if (ctx.style === 'wordmark') {
      return ctx.w - 180;
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
        messages.push('The text is about ' + over + '% too wide for this canvas ' +
          'and will run past the edge. Press <strong>Fit text to canvas</strong>, ' +
          'reduce the font size, or shorten the text.');
      }
    }

    /* Vertical fit matters on the short wordmark canvas. */
    if (state.style === 'wordmark' && state.fontSize > ctx.h * 0.55) {
      messages.push('The font size is tall enough that the text may be clipped ' +
        'at the top or bottom of the wordmark canvas.');
    }

    if (messages.length) {
      box.innerHTML = messages.join('<br>');
      box.hidden = false;
    } else {
      box.hidden = true;
    }
  }

  function fitTextToCanvas() {
    var ctx = normalizeState(state);
    if (!STYLES[state.style].textKey) return;

    if (!ctx.rawText) {
      setStatus('There is no text to fit. Type something into the text field first.', 'error');
      return;
    }

    var limit = maxTextWidth(ctx);
    if (!limit || !measureTextWidth(ctx)) {
      setStatus('This browser could not measure the text. Adjust the font size by hand.', 'error');
      return;
    }

    var range = NUMERIC_RANGES.fontSize;

    /* Why a search rather than simple arithmetic:
       rendered width is NOT proportional to font size. Letter spacing adds a
       fixed amount per character that does not shrink when the font shrinks,
       so scaling the size by (limit / measured) overshoots on long text and
       leaves it still overflowing. Bisection measures the real width at each
       candidate size and is correct regardless of font or spacing. */
    var lo = range[0];
    var hi = range[1];
    var best = null;

    if (measureTextWidth(ctx, lo) > limit) {
      /* Even the smallest permitted size does not fit. Say so plainly rather
         than silently leaving the text overflowing. */
      state.fontSize = lo;
      applyStateToControls();
      render();
      setStatus('This text is too long to fit even at the smallest font size. ' +
                'Shorten the text, or increase the icon size to give it more room.', 'error');
      return;
    }

    for (var step = 0; step < 20 && lo <= hi; step++) {
      var mid = Math.floor((lo + hi) / 2);
      if (measureTextWidth(ctx, mid) <= limit) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    var fitted = best === null ? range[0] : best;
    var grew = fitted > state.fontSize;

    state.fontSize = fitted;
    applyStateToControls();
    render();
    setStatus('Font size set to ' + fitted + ', the largest size that fits this canvas' +
              (grew ? ' (the text had room to grow)' : '') +
              '. It is saved with the concept like any other setting.', 'ok');
  }


  /* ======================================================================
     §10  EXPORT
     ====================================================================== */

  function exportFilename() {
    return slugify(state.creatorName) + '-logo.svg';
  }

  function downloadSVG() {
    var filename = exportFilename();

    /* The exported bytes are currentSVG itself — no regeneration, no canvas,
       no conversion step that could introduce a difference. */
    try {
      var blob = new Blob([currentSVG], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      setStatus('Downloaded ' + filename + '.', 'ok');
    } catch (err) {
      /* Fallback for browsers that block downloads from file:// pages. */
      var details = document.querySelector('.raw-svg');
      if (details) details.open = true;
      var textarea = byId('raw-svg-text');
      if (textarea) { textarea.focus(); textarea.select(); }
      setStatus('This browser blocked the download. The SVG code has been opened ' +
                'and selected below — copy it and save it as ' + filename + '.', 'error');
    }
  }


  /* ======================================================================
     §11  GALLERY AND JSON BACKUP
     ====================================================================== */

  var gallery = [];            // in-memory copy, always authoritative
  var storageWorks = true;     // false -> session-only, warning shown
  var pendingImport = null;    // concepts awaiting merge/replace choice

  function probeStorage() {
    try {
      var probe = '__logolab_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
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
      /* Most often a full storage quota. */
      setGalleryStatus('Could not save to this browser. Storage may be full or ' +
                       'blocked. Export a JSON backup so this work is not lost.', 'error');
      return false;
    }
  }

  function isUsableConcept(item) {
    return !!item && typeof item === 'object' &&
           typeof item.id === 'string' &&
           (typeof item.svg === 'string' || (item.state && typeof item.state === 'object'));
  }

  function saveConcept() {
    var suggested = STYLES[state.style].label + ' — ' +
                    new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    var name = window.prompt('Name this concept:', suggested);
    if (name === null) return;            // user cancelled
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

    /* Rebuild from the saved SETTINGS, not the saved picture, so improvements
       to a renderer reach older concepts. The saved picture is the fallback. */
    var restored = sanitiseState(concept.state);

    if (restored) {
      state = restored;
      applyStateToControls();
      render();
      setGalleryStatus('Loaded "' + concept.name + '". It was rebuilt from its saved ' +
                       'settings, so it may differ slightly from the thumbnail if a ' +
                       'drawing style has been improved since.', 'ok');
    } else if (typeof concept.svg === 'string' && concept.svg) {
      /* Settings unreadable: show the stored artwork so the work is not lost,
         but be honest that the controls no longer match what is displayed. */
      currentSVG = concept.svg;
      paintPreviews();
      setGalleryStatus('The saved settings for "' + concept.name + '" could not be read. ' +
                       'The stored picture is shown instead, but the controls no longer ' +
                       'match it. Download it now if you want to keep it.', 'error');
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

  function renderGallery() {
    var list = byId('gallery-list');
    var empty = byId('gallery-empty');
    list.innerHTML = '';

    empty.hidden = gallery.length > 0;

    gallery.forEach(function (concept) {
      var item = document.createElement('li');
      item.className = 'concept';

      var thumb = document.createElement('div');
      thumb.className = 'concept__thumb';
      /* The thumbnail shows the artwork exactly as saved. No ids in the
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
      meta.textContent = styleLabel + ' • saved ' + formatTimestamp(concept.savedAt);

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

  /* ---- JSON backup ---- */

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

    try {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = slugify(state.creatorName) + '-logo-gallery.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      setGalleryStatus('Exported ' + gallery.length + ' concept' +
                       (gallery.length === 1 ? '' : 's') + ' as JSON.', 'ok');
    } catch (err) {
      setGalleryStatus('This browser blocked the download, so the backup file ' +
                       'could not be created.', 'error');
    }
  }

  /* Validates an imported file and reports precisely what is wrong, rather
     than a generic failure. */
  function handleImportFile(file) {
    var reader = new FileReader();

    reader.onerror = function () {
      setGalleryStatus('The file could not be read.', 'error');
    };

    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (err) {
        setGalleryStatus('That file is not valid JSON, so it cannot be imported.', 'error');
        return;
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setGalleryStatus('That file is not a Logo Lab backup.', 'error');
        return;
      }
      if (parsed.app !== 'logo-lab') {
        setGalleryStatus('That file is valid JSON but was not created by Logo Lab.', 'error');
        return;
      }
      if (!Array.isArray(parsed.concepts)) {
        setGalleryStatus('That backup file has no list of concepts in it.', 'error');
        return;
      }

      var accepted = [];
      var skipped = 0;

      parsed.concepts.forEach(function (raw) {
        if (!isUsableConcept(raw)) { skipped++; return; }
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
      /* Merge: incoming concepts with a clashing id get a fresh one so
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
     §12  STATUS HELPERS AND INIT
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
    setStatus('Controls reset to their default values.');
  }

  function bindButtons() {
    byId('btn-export-svg').addEventListener('click', downloadSVG);
    byId('btn-save-concept').addEventListener('click', saveConcept);
    byId('btn-reset').addEventListener('click', resetToDefaults);
    byId('btn-fit-text').addEventListener('click', fitTextToCanvas);

    byId('btn-export-json').addEventListener('click', exportGalleryJSON);

    byId('btn-import-json').addEventListener('click', function () {
      byId('import-file').click();
    });

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
      if (!gallery.length) {
        setGalleryStatus('The gallery is already empty.', 'error');
        return;
      }
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
  }

  function init() {
    buildFontOptions();
    buildPaletteButtons();
    bindControls();
    bindButtons();

    storageWorks = probeStorage();
    if (!storageWorks) {
      byId('storage-warning').hidden = false;
    }

    gallery = loadGallery();
    renderGallery();

    applyStateToControls();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
