import { viewportTransform } from "./viewport";

export function fillText(text, bounds, fontSize, fillStyle = "white") {
  const margin = this.BOX_MARGIN * this.pixelRatio;
  const width = bounds.x1 - bounds.x0 - margin * 2;
  const height = bounds.y1 - bounds.y0 - margin * 2;
  if (
    text === null ||
    text === undefined ||
    String(text).length === 0 ||
    width <= 0 ||
    height <= 0 ||
    fontSize < 6 * this.pixelRatio
  ) {
    return;
  }

  this.canvas2dContext.save();
  this.canvas2dContext.beginPath();
  this.canvas2dContext.rect(
    bounds.x0 + margin,
    bounds.y0 + margin,
    width,
    height
  );
  this.canvas2dContext.clip();

  this.canvas2dContext.font = fontSize + "px sans-serif";
  this.canvas2dContext.fillStyle = fillStyle;
  this.canvas2dContext.lineJoin = "round";
  this.canvas2dContext.lineWidth = Math.max(
    this.pixelRatio,
    fontSize * 0.06
  );
  this.canvas2dContext.strokeStyle = "rgba(9, 14, 25, 0.84)";
  this.canvas2dContext.textAlign = "center";
  this.canvas2dContext.textBaseline = "middle";

  const maxWidth = width;
  const centerX = (bounds.x0 + bounds.x1) / 2;
  const centerY = (bounds.y0 + bounds.y1) / 2;
  const lineHeight = fontSize * 1.2;

  const words = String(text).replace(/\r?\n/g, " \n ").split(" ");
  let line = "";
  let lines = [];

  for (let n = 0; n < words.length; n++) {
    let word = words[n];
    if (word === "\n") {
      lines.push(line.trim());
      line = "";
      continue;
    }
    const testLine = line + word + " ";
    if (this.canvas2dContext.measureText(testLine).width <= maxWidth) {
      line = testLine;
      continue;
    }
    if (line) {
      lines.push(line.trim());
      line = "";
    }
    while (
      word.length > 1 &&
      this.canvas2dContext.measureText(word).width > maxWidth
    ) {
      let splitAt = word.length - 1;
      while (
        splitAt > 1 &&
        this.canvas2dContext.measureText(word.slice(0, splitAt)).width >
          maxWidth
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

  const maxLines = Math.max(1, Math.floor(height / lineHeight));
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let lastLine = lines[maxLines - 1];
    while (
      lastLine &&
      this.canvas2dContext.measureText(lastLine + "…").width > maxWidth
    ) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[maxLines - 1] = lastLine + "…";
  }

  const totalHeight = lines.length * lineHeight;
  let startY = centerY - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, index) => {
    this.canvas2dContext.strokeText(
      line,
      centerX,
      startY + index * lineHeight,
      maxWidth
    );
    this.canvas2dContext.fillText(
      line,
      centerX,
      startY + index * lineHeight,
      maxWidth
    );
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
    transformed.y1 - transformed.y0
  );
}

export function clearAll() {
  this.canvas2dContext.clearRect(
    0,
    0,
    this.canvasElement.width,
    this.canvasElement.height
  );
}

export function fillRect(x0, y0, w, h, { color }) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  let transformed = viewportTransform.call(this, { x0, y0, x1, y1 });
  const margin = this.BOX_MARGIN * this.pixelRatio;
  const transformedWidth = transformed.x1 - transformed.x0 - margin * 2;
  const transformedHeight = transformed.y1 - transformed.y0 - margin * 2;
  if (transformedWidth <= 0 || transformedHeight <= 0) {
    return;
  }

  this.canvas2dContext.fillStyle = color;
  this.canvas2dContext.fillRect(
    transformed.x0 + margin,
    transformed.y0 + margin,
    transformedWidth,
    transformedHeight
  );
}
