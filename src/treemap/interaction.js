export function onMouseMove(layerx, layery) {
  const transformed = this.viewportUtils.reverseTransform({
    x0: layerx * this.pixelRatio,
    y0: layery * this.pixelRatio,
    x1: layerx * this.pixelRatio,
    y1: layery * this.pixelRatio,
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
}

export function onClickEventListener(e) {
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
