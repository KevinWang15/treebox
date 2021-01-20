import { calcTransitioningViewport } from "./viewport";

export function transitionTo(viewport, { transitionDirection = 1 }) {
  if (this.viewportTransitionInProgress) {
    return Promise.reject("viewportTransition in progress");
  }
  this.viewportTransitionInProgress = true;
  return new Promise((resolve) => {
    const transitionStart = +new Date();
    const transitionLength = 300;
    const pristineViewport = this.viewport;

    let onAnimationFrame = () => {
      let progress = (+new Date() - transitionStart) / transitionLength;
      if (progress > 1) {
        progress = 1;
      }
      Object.assign(
        this.viewport,
        calcTransitioningViewport(pristineViewport, viewport, progress)
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
  let nodeAndViewport = {
    node: targetNode,
    viewport: targetNode,
  };
  this.viewportHistory.push(nodeAndViewport);

  this.transitionTo(targetNode, {}).then(() => {
    this.activeNode = targetNode;
    this.transitionTargetNode = null;
    this.repaint();
    setTimeout(() => {
      this.onMouseMove({ x: this.lastMousePos.x, y: this.lastMousePos.y });
    });
  });
}

export function zoomOut() {
  if (this.viewportTransitionInProgress) {
    return;
  }
  this.viewportHistory.pop();
  let lastNodeAndViewport = this.viewportHistory[
    this.viewportHistory.length - 1
  ];
  if (!lastNodeAndViewport) {
    lastNodeAndViewport = { node: this.rootNode, viewport: this.rootNode };
  }
  this.activeNode = lastNodeAndViewport.node;

  this.transitionTargetNode = this.activeNode;
  this.transitionTo(lastNodeAndViewport.viewport, {
    transitionDirection: -1,
  }).then(() => {
    this.transitionTargetNode = null;
    this.lastHoveringItem = null;
    this.repaint();
    setTimeout(() => {
      this.onMouseMove({ x: this.lastMousePos.x, y: this.lastMousePos.y });
    });
  });
}
