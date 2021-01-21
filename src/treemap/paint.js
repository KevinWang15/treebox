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

    let fontSize = Math.round((bounds.x1 - bounds.x0) / 10);

    const paintNormal = () => {
      let color = null;

      try {
        color = item.color({
          hovering,
          ctx: this.canvas2dContext,
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
        this.canvas2dContext.save();
        this.canvas2dContext.globalAlpha = 1 - transitionProgress;
        this.canvasUtils.fillRect(
          item.x0,
          item.y0,
          item.x1 - item.x0,
          item.y1 - item.y0,
          {
            color: item.color({
              hovering,
              ctx: this.canvas2dContext,
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
        this.canvas2dContext.restore();
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

  this.clearRectAndPaintLayer(this.activeNode, { hovering: false, depth: -1 });
}
