import { viewportTransform } from "./viewport";

export function fillText(text, bounds, fontSize, fillStyle = "white") {
  this.canvas2dContext.save();
  this.canvas2dContext.beginPath();
  this.canvas2dContext.rect(
    bounds.x0,
    bounds.y0,
    bounds.x1 - bounds.x0,
    bounds.y1 - bounds.y0
  );
  this.canvas2dContext.clip();

  this.canvas2dContext.font = fontSize + "px sans-serif";
  this.canvas2dContext.fillStyle = fillStyle;
  this.canvas2dContext.textAlign = "center";
  this.canvas2dContext.textBaseline = "middle";
  this.canvas2dContext.fillText(
    text,
    (bounds.x0 + bounds.x1) / 2,
    (bounds.y0 + bounds.y1) / 2
  );
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

export function fillRect(x0, y0, w, h, { margin = 0, color }) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  let transformed = viewportTransform.call(this, { x0, y0, x1, y1 });
  this.canvas2dContext.fillStyle = color;
  this.canvas2dContext.fillRect(
    transformed.x0 + margin,
    transformed.y0 + margin,
    transformed.x1 - transformed.x0 - margin * 2,
    transformed.y1 - transformed.y0 - margin * 2
  );
}
