import Color from "color";

export function clearRectAndPaintLayer(e, p) {
  this.canvasUtils.clearRect(e.x0, e.y0, e.x1 - e.x0, e.y1 - e.y0);
  this.paintLayer([e], p);
}

/**
 * low-level api to actually draw to the canvas.
 * will be called multiple times during a transition
 */
export function paintLayer(
  data,
  { hovering, transitionProgress = 0, depth, transitionDirection = 1 }
) {
  if (!data || depth > 2) {
    return;
  }

  for (let item of data) {
    let bounds = this.viewportUtils.transform({
      x0: item.x0,
      y0: item.y0,
      x1: item.x1,
      y1: item.y1,
    });

    // let fontSize = 100;
    let fontSize = item.fontSize;
    const paintNormal = () => {
      this.canvasUtils.fillRect(
        item.x0,
        item.y0,
        item.x1 - item.x0,
        item.y1 - item.y0,
        {
          margin: 1,
          color: item.color({
            hovering,
            ctx: this.canvas2dContext,
            transitionProgress: 0,
            bounds,
          }),
        }
      );
      if (depth <= 2) {
        this.canvasUtils.fillText(item.text, bounds, fontSize);
      }
    };

    if (item.children) {
      this.paintLayer(item.children, {
        hovering,
        transitionProgress,
        transitionDirection,
        depth: depth + 1,
      });
      if (this.transitionTargetNode === item) {
        this.canvasUtils.fillRect(
          item.x0,
          item.y0,
          item.x1 - item.x0,
          item.y1 - item.y0,
          {
            margin: 1,
            color: item.color({
              hovering,
              ctx: this.canvas2dContext,
              transitionProgress,
              bounds,
            }),
          }
        );
        if (depth <= 2) {
          this.canvasUtils.fillText(
            item.text,
            bounds,
            fontSize,
            Color("white").opaquer(-transitionProgress)
          );
        }
      } else if (this.activeNode !== item) {
        paintNormal();
      }
    } else {
      this.canvasUtils.clearRect(
        item.x0,
        item.y0,
        item.x1 - item.x0,
        item.y1 - item.y0
      );
      paintNormal();
    }
  }
}

export function repaint() {
  if (!this.activeNode.children) {
    this.updateLayerFontSize([this.activeNode], { depth: 0 });
  } else {
    this.updateLayerFontSize(this.activeNode.children, { depth: 0 });
  }
  this.clearRectAndPaintLayer(this.activeNode, { hovering: false, depth: -1 });
}

export function updateLayerFontSize(data, { depth = 0 } = { depth: 0 }) {
  if (!data) {
    return;
  }
  let totalWeight = 0;
  for (let item of data) {
    totalWeight += item.weight;
    if (item.children && depth <= 2) {
      this.updateLayerFontSize(item.children, { depth: depth + 1 });
    }
  }
  for (let item of data) {
    item.fontSize = Math.round(
      ((200 * this.pixelRatio) / (1 + depth)) *
        Math.sqrt(item.weight / totalWeight)
    );
  }
}