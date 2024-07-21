import { viewportTransform } from "./viewport";

export function fillText(text, bounds, fontSize, fillStyle = "white") {
  this.canvas2dContext.save();
  this.canvas2dContext.beginPath();
  this.canvas2dContext.rect(
      bounds.x0 + this.BOX_MARGIN,
      bounds.y0 + this.BOX_MARGIN,
      bounds.x1 - bounds.x0 - this.BOX_MARGIN * 2,
      bounds.y1 - bounds.y0 - this.BOX_MARGIN * 2
  );
  this.canvas2dContext.clip();

  this.canvas2dContext.font = fontSize + "px sans-serif";
  this.canvas2dContext.fillStyle = fillStyle;
  this.canvas2dContext.textAlign = "center";
  this.canvas2dContext.textBaseline = "middle";

  const maxWidth = bounds.x1 - bounds.x0 - this.BOX_MARGIN * 2;
  const centerX = (bounds.x0 + bounds.x1) / 2;
  const centerY = (bounds.y0 + bounds.y1) / 2;
  const lineHeight = fontSize * 1.2;

  const words = text.split(' ');
  let line = '';
  let lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = this.canvas2dContext.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  const totalHeight = lines.length * lineHeight;
  let startY = centerY - (totalHeight / 2) + (lineHeight / 2);

  lines.forEach((line, index) => {
    this.canvas2dContext.fillText(
        line,
        centerX,
        startY + (index * lineHeight)
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
  this.canvasUtils.clearRect(
    0,
    0,
    this.domElement.clientWidth,
    this.domElement.clientHeight
  );
}

export function fillRect(x0, y0, w, h, { color }) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  let transformed = viewportTransform.call(this, { x0, y0, x1, y1 });
  this.canvas2dContext.fillStyle = color;
  this.canvas2dContext.fillRect(
    transformed.x0 + this.BOX_MARGIN,
    transformed.y0 + this.BOX_MARGIN,
    transformed.x1 - transformed.x0 - this.BOX_MARGIN * 2,
    transformed.y1 - transformed.y0 - this.BOX_MARGIN * 2
  );
}
