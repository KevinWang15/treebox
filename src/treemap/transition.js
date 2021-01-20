import { calcTransitioningViewport } from "./viewport";

export function transitionTo(target, { transitionDirection = 1 }) {
  if (this.viewportTransitionInProgress) {
    return Promise.reject("viewportTransition in progress");
  }
  this.viewportTransitionInProgress = true;
  return new Promise((resolve) => {
    const transitionStart = +new Date();
    const transitionLength = 300;

    let onAnimationFrame = () => {
      let progress = (+new Date() - transitionStart) / transitionLength;
      if (progress > 1) {
        progress = 1;
      }
      Object.assign(
        this.viewport,
        calcTransitioningViewport(this.viewport, target, progress)
      );
      this.canvasUtils.clearAll();
      this.paintLayer(this.activeNode.children, {
        hovering: false,
        transitionProgress: progress,
        depth: 0,
        transitionDirection,
      });

      if (progress < 1) {
        requestAnimationFrame(onAnimationFrame);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(onAnimationFrame);
  }).finally(() => {
    this.viewportTransitionInProgress = false;
  });
}

export function zoomIn(targetNode) {
  targetNode.parent = this.activeNode;
  this.transitionTargetNode = targetNode;
  this.transitionTo(targetNode, {}).then(() => {
    this.activeNode = targetNode;
    this.transitionTargetNode = null;
    this.repaint();
    setTimeout(() => {
      this.onMouseMove(this.lastMousePos.x, this.lastMousePos.y);
    });
  });
}

export function zoomOut() {
  if (this.viewportTransitionInProgress) {
    return;
  }
  if (!this.activeNode.parent) {
    return;
  }
  this.activeNode = this.activeNode.parent;
  this.transitionTargetNode = this.activeNode;
  this.transitionTo(this.activeNode, { transitionDirection: -1 }).then(() => {
    this.transitionTargetNode = null;
    this.lastHoveringItem = null;
    this.repaint();
    setTimeout(() => {
      this.onMouseMove(this.lastMousePos.x, this.lastMousePos.y);
    });
  });
}
