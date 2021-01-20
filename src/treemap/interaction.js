import { normalizeViewport } from "./viewport";

export function onMouseMove(e, offsetX, offsetY) {
  const transformed = this.viewportUtils.reverseTransform({
    x0: offsetX,
    y0: offsetY,
    x1: offsetX,
    y1: offsetY,
  });
  const x = transformed.x0;
  const y = transformed.y0;
  for (const e of this.activeNode.children || []) {
    if (e.x0 < x && e.x1 > x && e.y0 < y && e.y1 > y) {
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
    e &&
    this.isMouseDown &&
    this.lastMouseDownPos &&
    selectionAreaTriggered.call(this, e)
  ) {
    let x0 = e.offsetX;
    let x1 = this.lastMouseDownPos.offsetX;
    let y0 = e.offsetY;
    let y1 = this.lastMouseDownPos.offsetY;
    this.selectionAreaElement.style.display = "block";
    this.selectionAreaElement.style.top =
      Math.min(y0, y1) + this.domElementRect.top + "px";
    this.selectionAreaElement.style.left =
      Math.min(x0, x1) + this.domElementRect.left + "px";
    this.selectionAreaElement.style.width = Math.abs(x0 - x1) + "px";
    this.selectionAreaElement.style.height = Math.abs(y0 - y1) + "px";

    this.selectionAreaViewPort = this.viewportUtils.reverseTransform(
      normalizeViewport({
        x0: this.lastMouseDownPos.offsetX,
        y0: this.lastMouseDownPos.offsetY,
        x1: offsetX,
        y1: offsetY,
      })
    );
  }
}

export function onClickEventListener(e) {
  if (this.lastMouseDownPos && selectionAreaTriggered.call(this, e)) {
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
  if (
    this.lastHoveringItem &&
    (!this.lastHoveringItem.parent ||
      this.lastHoveringItem.parent.children.length > 1)
  ) {
    this.zoomIn(this.lastHoveringItem);
  }
}

export function onMouseDownEventListener(e) {
  this.isMouseDown = true;
  this.lastMouseDownPos = {
    offsetX: e.offsetX,
    offsetY: e.offsetY,
  };
}

export function onMouseUpEventListener(e) {
  this.isMouseDown = false;
  this.selectionAreaElement.style.display = "none";
  if (this.selectionAreaViewPort) {
    this.transitionTo(this.selectionAreaViewPort, { transitionDirection: 1 });
    this.selectionAreaViewPort = null;
  }
}

export function selectionAreaTriggered(e) {
  return (
    Math.abs(e.offsetX - this.lastMouseDownPos.offsetX) +
      Math.abs(e.offsetY - this.lastMouseDownPos.offsetY) >
    this.SELECTION_AREA_TRIGGER_THRESHOLD
  );
}
