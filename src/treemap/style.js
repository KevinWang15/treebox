// Visual options for a treemap. Every value has a default that reproduces the
// original look, so passing no style changes nothing. Sizes are CSS pixels.
export const DEFAULT_STYLE = Object.freeze({
  // Space between adjacent blocks. Each block is inset by half of it.
  gap: 2,
  cornerRadius: 0,
  fontFamily: "sans-serif",
  fontWeight: "normal",
  // Labels scale with their block, between these sizes. A block too small for
  // minFontSize shows no label.
  minFontSize: 6,
  maxFontSize: 160,
  // A CSS color, or a callback receiving { ctx, hovering, item, bounds } that
  // returns one, e.g. to pick a readable color for each block's fill.
  textColor: "white",
  // Outline drawn behind label text, or null for none.
  textStroke: "rgba(9, 14, 25, 0.84)",
  // "center" centers the label in its block; "start" anchors it to the
  // top-left corner (top-right for right-to-left canvases).
  textAlign: "center",
  // Space between a block's edge and its label.
  textPadding: 0,
  // How a hovered or keyboard-focused block is drawn. An opacity below 1 lets
  // the next level show through.
  hoverOpacity: 0.6,
  // A canvas filter such as "brightness(110%)", or "none".
  hoverFilter: "brightness(110%) saturate(120%)",
});

const TEXT_ALIGNS = ["center", "start"];

function fail(message) {
  throw new TypeError(`TreeBox style: ${message}`);
}

function nonNegative(value, key) {
  if (!Number.isFinite(value) || value < 0) {
    fail(`${key} must be a finite number of at least 0`);
  }
}

function positive(value, key) {
  if (!Number.isFinite(value) || value <= 0) {
    fail(`${key} must be a finite number greater than 0`);
  }
}

function nonEmptyString(value, key) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${key} must be a non-empty string`);
  }
}

const VALIDATORS = {
  gap: nonNegative,
  cornerRadius: nonNegative,
  textPadding: nonNegative,
  minFontSize: positive,
  maxFontSize: positive,
  fontFamily: nonEmptyString,
  hoverFilter: nonEmptyString,
  fontWeight(value) {
    if (
      !(typeof value === "string" && value.trim()) &&
      !(Number.isFinite(value) && value >= 1 && value <= 1000)
    ) {
      fail("fontWeight must be a CSS font-weight keyword or 1 to 1000");
    }
  },
  textColor(value) {
    if (typeof value !== "function") {
      nonEmptyString(value, "textColor");
    }
  },
  textStroke(value) {
    if (value !== null) {
      nonEmptyString(value, "textStroke");
    }
  },
  textAlign(value) {
    if (!TEXT_ALIGNS.includes(value)) {
      fail(`textAlign must be one of ${TEXT_ALIGNS.join(", ")}`);
    }
  },
  hoverOpacity(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      fail("hoverOpacity must be a number from 0 to 1");
    }
  },
};

// Merges overrides into a base style and validates the result. Unknown keys
// are rejected so a misspelled option fails loudly instead of being ignored.
export function resolveStyle(base, overrides) {
  if (overrides === undefined || overrides === null) {
    return base;
  }
  if (typeof overrides !== "object" || Array.isArray(overrides)) {
    fail("style must be an object");
  }
  for (const key of Object.keys(overrides)) {
    // Object.hasOwn is newer than the ES2015 library target.
    if (!Object.prototype.hasOwnProperty.call(VALIDATORS, key)) {
      fail(`unknown option "${key}"`);
    }
  }

  const style = { ...base, ...overrides };
  for (const key of Object.keys(VALIDATORS)) {
    VALIDATORS[key](style[key], key);
  }
  if (style.minFontSize > style.maxFontSize) {
    fail("minFontSize must not exceed maxFontSize");
  }
  return Object.freeze(style);
}

// The style in effect for a painting context. Contexts without one (such as
// test doubles of the canvas helpers) use the defaults.
export function styleOf(context) {
  return context.style || DEFAULT_STYLE;
}

// The CSS font for a label size. Labels are drawn on every frame of a zoom
// transition, so each style caches its fonts by size (sizes are whole CSS
// pixels times the pixel ratio, so there are only a few distinct ones).
const fontCaches = new WeakMap();

export function labelFont(style, fontSize) {
  let fonts = fontCaches.get(style);
  if (fonts === undefined) {
    fonts = new Map();
    fontCaches.set(style, fonts);
  }
  let font = fonts.get(fontSize);
  if (font === undefined) {
    // "normal" is the CSS default, so it's left out and unstyled labels keep
    // the exact font string they always had.
    const weight = style.fontWeight === "normal" ? "" : `${style.fontWeight} `;
    font = `${weight}${fontSize}px ${style.fontFamily}`;
    fonts.set(fontSize, font);
  }
  return font;
}

const warnedTextColorItems = new WeakSet();

export function resolveTextColor(context, args) {
  const { textColor } = styleOf(context);
  if (typeof textColor !== "function") {
    return textColor;
  }
  try {
    const color = textColor(args);
    if (typeof color === "string" && color) {
      return color;
    }
    throw new TypeError("textColor must return a CSS color string");
  } catch (error) {
    if (!warnedTextColorItems.has(args.item)) {
      warnedTextColorItems.add(args.item);
      console.warn("TreeBox could not resolve a text color", error);
    }
    return DEFAULT_STYLE.textColor;
  }
}
