import { labelFont, styleOf } from "./style";
import { viewportTransform } from "./viewport";

function measureTextWidth(context, text) {
  return context.measureText(text).width;
}

function createTextLayout(context, text, maxWidth, height, fontSize) {
  const words = text.replace(/\r?\n/g, " \n ").split(" ");
  let line = "";
  const lines = [];

  for (let n = 0; n < words.length; n++) {
    let word = words[n];
    if (word === "\n") {
      lines.push(line.trim());
      line = "";
      continue;
    }
    const testLine = line + word + " ";
    if (measureTextWidth(context, testLine) <= maxWidth) {
      line = testLine;
      continue;
    }
    if (line) {
      lines.push(line.trim());
      line = "";
    }
    while (word.length > 1 && measureTextWidth(context, word) > maxWidth) {
      let splitAt = word.length - 1;
      while (
        splitAt > 1 &&
        measureTextWidth(context, word.slice(0, splitAt)) > maxWidth
      ) {
        splitAt--;
      }
      lines.push(word.slice(0, splitAt));
      word = word.slice(splitAt);
    }
    line = word + " ";
  }
  if (line || !lines.length) {
    lines.push(line.trim());
  }

  const lineHeight = fontSize * 1.2;
  const maxLines = Math.max(1, Math.floor(height / lineHeight));
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let lastLine = lines[maxLines - 1];
    while (lastLine && measureTextWidth(context, lastLine + "…") > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[maxLines - 1] = lastLine + "…";
  }

  return lines;
}

function getTextLayout(context, item, text, maxWidth, height, fontSize, font) {
  if (!item || (typeof item !== "object" && typeof item !== "function")) {
    return createTextLayout(
      context.canvas2dContext,
      text,
      maxWidth,
      height,
      fontSize,
    );
  }

  if (!context.textLayoutCache) {
    context.textLayoutCache = new WeakMap();
  }
  // The font is part of the key: the same text wraps differently in another face.
  const cached = context.textLayoutCache.get(item);
  if (
    cached &&
    cached.text === text &&
    cached.maxWidth === maxWidth &&
    cached.height === height &&
    cached.fontSize === fontSize &&
    cached.font === font
  ) {
    return cached.lines;
  }

  const layout = createTextLayout(
    context.canvas2dContext,
    text,
    maxWidth,
    height,
    fontSize,
  );
  context.textLayoutCache.set(item, {
    text,
    maxWidth,
    height,
    fontSize,
    font,
    lines: layout,
  });
  return layout;
}

export function fillText(text, bounds, fontSize, fillStyle = "white", item) {
  const style = styleOf(this);
  const inset = (style.gap / 2) * this.pixelRatio;
  const padding = style.textPadding * this.pixelRatio;
  const x0 = bounds.x0 + inset + padding;
  const y0 = bounds.y0 + inset + padding;
  const width = bounds.x1 - bounds.x0 - (inset + padding) * 2;
  const height = bounds.y1 - bounds.y0 - (inset + padding) * 2;
  if (
    text === null ||
    text === undefined ||
    String(text).length === 0 ||
    width <= 0 ||
    height <= 0 ||
    fontSize < style.minFontSize * this.pixelRatio
  ) {
    return;
  }

  this.canvas2dContext.save();
  this.canvas2dContext.beginPath();
  this.canvas2dContext.rect(x0, y0, width, height);
  this.canvas2dContext.clip();

  const font = labelFont(style, fontSize);
  this.canvas2dContext.font = font;
  this.canvas2dContext.fillStyle = fillStyle;
  this.canvas2dContext.lineJoin = "round";
  this.canvas2dContext.lineWidth = Math.max(this.pixelRatio, fontSize * 0.06);
  if (style.textStroke) {
    this.canvas2dContext.strokeStyle = style.textStroke;
  }
  const start = style.textAlign === "start";
  // "start" follows the canvas direction, so it means right-aligned in RTL.
  const rtl = start && this.canvas2dContext.direction === "rtl";
  this.canvas2dContext.textAlign = start ? "start" : "center";
  this.canvas2dContext.textBaseline = "middle";

  const maxWidth = width;
  const anchorX = start ? (rtl ? x0 + width : x0) : (bounds.x0 + bounds.x1) / 2;
  const lineHeight = fontSize * 1.2;

  const lines = getTextLayout(
    this,
    item,
    String(text),
    maxWidth,
    height,
    fontSize,
    font,
  );
  const totalHeight = lines.length * lineHeight;
  const startY = start
    ? y0 + lineHeight / 2
    : (bounds.y0 + bounds.y1) / 2 - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    if (style.textStroke) {
      this.canvas2dContext.strokeText(line, anchorX, y, maxWidth);
    }
    this.canvas2dContext.fillText(line, anchorX, y, maxWidth);
  });

  this.canvas2dContext.restore();
}

export function clearRect(x0, y0, w, h) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  let transformed = viewportTransform.call(this, { x0, y0, x1, y1 });
  this.canvas2dContext.clearRect(
    transformed.x0,
    transformed.y0,
    transformed.x1 - transformed.x0,
    transformed.y1 - transformed.y0,
  );
}

export function clearAll() {
  this.canvas2dContext.clearRect(
    0,
    0,
    this.canvasElement.width,
    this.canvasElement.height,
  );
}

export function fillRect(x0, y0, w, h, { color }) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  let transformed = viewportTransform.call(this, { x0, y0, x1, y1 });
  const style = styleOf(this);
  const inset = (style.gap / 2) * this.pixelRatio;
  const transformedWidth = transformed.x1 - transformed.x0 - inset * 2;
  const transformedHeight = transformed.y1 - transformed.y0 - inset * 2;
  if (transformedWidth <= 0 || transformedHeight <= 0) {
    return;
  }

  this.canvas2dContext.fillStyle = color;
  // A radius never exceeds half the block, so small blocks stay rectangles
  // with rounded ends rather than distorting.
  const radius = Math.min(
    style.cornerRadius * this.pixelRatio,
    transformedWidth / 2,
    transformedHeight / 2,
  );
  if (radius > 0 && typeof this.canvas2dContext.roundRect === "function") {
    this.canvas2dContext.beginPath();
    this.canvas2dContext.roundRect(
      transformed.x0 + inset,
      transformed.y0 + inset,
      transformedWidth,
      transformedHeight,
      radius,
    );
    this.canvas2dContext.fill();
    return;
  }
  this.canvas2dContext.fillRect(
    transformed.x0 + inset,
    transformed.y0 + inset,
    transformedWidth,
    transformedHeight,
  );
}
