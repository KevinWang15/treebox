export function calcTransitioningViewport(
  currentViewport,
  targetViewport,
  prog
) {
  const baseX0 = currentViewport.x0;
  const diffX0 = targetViewport.x0 - baseX0;
  const baseX1 = currentViewport.x1;
  const diffX1 = targetViewport.x1 - baseX1;
  const baseY0 = currentViewport.y0;
  const diffY0 = targetViewport.y0 - baseY0;
  const baseY1 = currentViewport.y1;
  const diffY1 = targetViewport.y1 - baseY1;
  return {
    x0: baseX0 + diffX0 * prog,
    x1: baseX1 + diffX1 * prog,
    y0: baseY0 + diffY0 * prog,
    y1: baseY1 + diffY1 * prog,
  };
}

export function viewportTransform({ x0, y0, x1, y1 }) {
  const vpw = this.viewport.x1 - this.viewport.x0;
  const vph = this.viewport.y1 - this.viewport.y0;
  return {
    x0: ((x0 - this.viewport.x0) / vpw) * this.canvasElement.clientWidth,
    x1: ((x1 - this.viewport.x0) / vpw) * this.canvasElement.clientWidth,
    y0: ((y0 - this.viewport.y0) / vph) * this.canvasElement.clientHeight,
    y1: ((y1 - this.viewport.y0) / vph) * this.canvasElement.clientHeight,
  };
}

export function reverseViewportTransform({ x0, y0, x1, y1 }) {
  const vpw = this.viewport.x1 - this.viewport.x0;
  const vph = this.viewport.y1 - this.viewport.y0;
  return {
    x0: (x0 * vpw) / this.canvasElement.clientWidth + this.viewport.x0,
    x1: (x1 * vpw) / this.canvasElement.clientWidth + this.viewport.x1,
    y0: (y0 * vph) / this.canvasElement.clientHeight + this.viewport.y0,
    y1: (y1 * vph) / this.canvasElement.clientHeight + this.viewport.y1,
  };
}
