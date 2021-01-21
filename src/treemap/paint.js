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

  if (depth <= 2) {
    this.updateLayerFontSize(data);
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
      let color = null;

      try {
        color = item.color({
          hovering,
          ctx: this.canvas2dContext,
          transitionProgress: 0,
          bounds,
        });

        this.canvasUtils.fillRect(
          item.x0,
          item.y0,
          item.x1 - item.x0,
          item.y1 - item.y0,
          {
            color: color,
          }
        );
      } catch (e) {
        console.warn(e);
      }

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
  this.domElementRect = this.domElement.getBoundingClientRect();
  this.canvasElement.width = this.domElementRect.width * this.pixelRatio;
  this.canvasElement.height = this.domElementRect.height * this.pixelRatio;

  if (!this.activeNode.children) {
    this.updateLayerFontSize([this.activeNode]);
  } else {
    this.updateLayerFontSize(this.activeNode.children);
  }
  this.clearRectAndPaintLayer(this.activeNode, { hovering: false, depth: -1 });
}

export function updateLayerFontSize(data) {
  if (!data) {
    return;
  }

  // approximate size using width only, to avoid sqrt() and improve performance
  const factor =
    (Math.ceil(10000 / (this.viewport.x1 - this.viewport.x0)) *
      this.pixelRatio) /
    50;

  for (const item of data) {
    if (
      (item.x0 < this.viewport.x0 ||
        item.y0 < this.viewport.y0 ||
        item.x1 > this.viewport.x1 ||
        item.y1 > this.viewport.y1)
    ) {
      continue;
    }

    item.fontSize = item.w * factor; // this is super expensive.. hurts performance so bad
    // item.fontSize = item.w + factor;
  }
}
