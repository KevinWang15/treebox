import { calcTransitioningViewport } from "./viewport";

export function transitionTo(viewport) {
  if (this.viewportTransitionInProgress) {
    return Promise.reject(new Error("Viewport transition already in progress"));
  }
  this.viewportTransitionInProgress = true;
  return new Promise((resolve) => {
    const transitionStart = +new Date();
    const transitionLength =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 200;
    const pristineViewport = { ...this.viewport };

    let onAnimationFrame = () => {
      if (this.destroyed) {
        resolve();
        return;
      }

      let progress = transitionLength
        ? (+new Date() - transitionStart) / transitionLength
        : 1;
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
    if (this.resizePending && !this.destroyed) {
      this.resizePending = false;
      this.resize();
    }
    schedulePendingZoomOut.call(this);
  });
}

export function emitZoomEvent(direction) {
  this.emitEvent("zoom", {
    node: this.activeNode,
    direction,
    depth: this.viewportHistory.length,
    canZoomOut: this.viewportHistory.length > 0,
  });
}

export function zoomIn(targetNode) {
  if (
    !targetNode ||
    !targetNode.children ||
    !targetNode.children.length ||
    this.viewportTransitionInProgress
  ) {
    return Promise.resolve(false);
  }

  this.transitionTargetNode = targetNode;
  let nodeAndViewport = {
    node: targetNode,
    viewport: targetNode,
  };
  this.viewportHistory.push(nodeAndViewport);
  this.viewportHistoryUndoStack.splice(0);

  return this.transitionTo(targetNode).then(() => {
    if (this.destroyed) {
      return false;
    }

    this.activeNode = targetNode;
    this.transitionTargetNode = null;
    this.lastHoveringItem = null;
    this.repaint();
    repaintHoveredItem.call(this);
    this.emitZoomEvent("in");
    return true;
  });
}

export function zoomOut() {
  if (this.viewportTransitionInProgress) {
    this.pendingZoomOut = true;
    return new Promise((resolve) => {
      this.pendingZoomOutResolvers.push(resolve);
    });
  }
  if (!this.viewportHistory.length) {
    return Promise.resolve(false);
  }

  let popped = this.viewportHistory.pop();
  if (popped) {
    this.viewportHistoryUndoStack.push(popped);
  }
  let lastNodeAndViewport =
    this.viewportHistory[this.viewportHistory.length - 1];
  if (!lastNodeAndViewport) {
    lastNodeAndViewport = { node: this.rootNode, viewport: this.rootNode };
  }
  this.activeNode = lastNodeAndViewport.node;

  this.transitionTargetNode = this.activeNode;
  return this.transitionTo(lastNodeAndViewport.viewport).then(() => {
    if (this.destroyed) {
      return false;
    }

    this.transitionTargetNode = null;
    this.lastHoveringItem = null;
    this.repaint();
    repaintHoveredItem.call(this);
    this.emitZoomEvent("out");
    return true;
  });
}

export function undoZoomOut() {
  if (this.viewportTransitionInProgress) {
    return Promise.resolve(false);
  }
  if (!this.viewportHistoryUndoStack.length) {
    return Promise.resolve(false);
  }

  let lastNodeAndViewport = this.viewportHistoryUndoStack.pop();
  if (!lastNodeAndViewport) {
    return Promise.resolve(false);
  }
  this.viewportHistory.push(lastNodeAndViewport);

  this.transitionTargetNode = lastNodeAndViewport.node;

  return this.transitionTo(lastNodeAndViewport.viewport).then(() => {
    if (this.destroyed) {
      return false;
    }

    this.activeNode = lastNodeAndViewport.node;
    this.transitionTargetNode = null;
    this.lastHoveringItem = null;
    this.repaint();
    repaintHoveredItem.call(this);
    this.emitZoomEvent("redo");
    return true;
  });
}

function repaintHoveredItem() {
  if (!this.lastMousePos) {
    return;
  }

  setTimeout(() => {
    if (!this.destroyed && this.lastMousePos) {
      this.onMouseMove(this.lastMousePos);
    }
  });
}

function schedulePendingZoomOut() {
  if (!this.pendingZoomOut || this.pendingZoomOutScheduled || this.destroyed) {
    if (this.destroyed && this.pendingZoomOutResolvers.length) {
      this.pendingZoomOut = false;
      this.pendingZoomOutResolvers
        .splice(0)
        .forEach((resolve) => resolve(false));
    }
    return;
  }

  this.pendingZoomOutScheduled = true;
  setTimeout(() => {
    this.pendingZoomOutScheduled = false;
    if (this.destroyed) {
      this.pendingZoomOut = false;
      this.pendingZoomOutResolvers
        .splice(0)
        .forEach((resolve) => resolve(false));
      return;
    }

    this.pendingZoomOut = false;
    const resolvers = this.pendingZoomOutResolvers.splice(0);
    this.zoomOut().then((result) => {
      resolvers.forEach((resolve) => resolve(result));
    });
  });
}
