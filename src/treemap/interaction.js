import { normalizeViewport } from "./viewport";

function limitTo(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function onMouseMove({ x, y }) {
  const transformed = this.viewportUtils.reverseTransform({
    x0: x,
    y0: y,
    x1: x,
    y1: y,
  });

  const tx = transformed.x0;
  const ty = transformed.y0;
  for (const e of this.activeNode.children || []) {
    if (e.x0 < tx && e.x1 > tx && e.y0 < ty && e.y1 > ty) {
      if (!(this.lastHoveringItem && this.lastHoveringItem === e)) {
        if (this.lastHoveringItem) {
          this.clearRectAndPaintLayer(this.lastHoveringItem, {
            hovering: false,
            depth: 0,
          });
        }
        this.lastHoveringItem = e;
        this.clearRectAndPaintLayer(e, { hovering: true, depth: 0 });
        this.emitEvent("hover", e);
        break;
      }
    }
  }

  if (
    this.isMouseDown &&
    this.lastMouseDownPos &&
    selectionAreaTriggered.call(this, { x: x, y: y })
  ) {
    let x0 = limitTo(x, 0, this.domElementRect.width);
    let x1 = limitTo(this.lastMouseDownPos.x, 0, this.domElementRect.width);
    let y0 = limitTo(y, 0, this.domElementRect.height);
    let y1 = limitTo(this.lastMouseDownPos.y, 0, this.domElementRect.height);
    this.selectionAreaElement.style.display = "block";
    this.selectionAreaElement.style.top =
      Math.min(y0, y1) + this.domElementRect.top + "px";
    this.selectionAreaElement.style.left =
      Math.min(x0, x1) + this.domElementRect.left + "px";
    this.selectionAreaElement.style.width = Math.abs(x0 - x1) + "px";
    this.selectionAreaElement.style.height = Math.abs(y0 - y1) + "px";

    this.selectionAreaViewPort = this.viewportUtils.reverseTransform(
      normalizeViewport({
        x0,
        y0,
        x1,
        y1,
      })
    );
  }
}

export function onClickEventListener(e) {
  let x = e.pageX - this.domElementRect.left;
  let y = e.pageY - this.domElementRect.top;

  if (this.lastMouseDownPos && selectionAreaTriggered.call(this, { x, y })) {
    return;
  }
  if (this.viewportTransitionInProgress) {
    return;
  }
  if (this.transitionTargetNode) {
    return;
  }
  if (!this.activeNode.children) {
    return;
  }
  if (this.lastHoveringItem) {
    this.zoomIn(this.lastHoveringItem);
  }
}

export function onMouseDownEventListener(e) {
  this.isMouseDown = true;
  this.lastMouseDownPos = {
    x: e.pageX - this.domElementRect.left,
    y: e.pageY - this.domElementRect.top,
  };
}

export function onMouseUpEventListener(e) {
  this.isMouseDown = false;
  this.selectionAreaElement.style.display = "none";
  if (this.selectionAreaViewPort) {
    if (
      Math.abs(this.selectionAreaViewPort.x1 - this.selectionAreaViewPort.x0) *
        Math.abs(
          this.selectionAreaViewPort.y1 - this.selectionAreaViewPort.y0
        ) <
      400
    ) {
      this.selectionAreaViewPort = null;
      return;
    }
    this.viewportHistory.push({
      node: this.activeNode,
      viewport: this.selectionAreaViewPort,
    });
    this.transitionTo(this.selectionAreaViewPort, {
      transitionDirection: 1,
    }).then(() => {
      this.repaint();
    });
    this.selectionAreaViewPort = null;
  }
}

export function selectionAreaTriggered({ x, y }) {
  return (
    Math.abs(x - this.lastMouseDownPos.x) +
      Math.abs(y - this.lastMouseDownPos.y) >
    this.SELECTION_AREA_TRIGGER_THRESHOLD
  );
}
