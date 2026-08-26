import { calcTransitioningViewport } from "./viewport";

export function transitionTo(viewport) {
  if (this.destroyed) {
    return Promise.resolve(false);
  }
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
    schedulePendingNavigation.call(this);
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
    this.destroyed ||
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
  if (this.destroyed) {
    return Promise.resolve(false);
  }
  if (this.viewportTransitionInProgress) {
    return queueNavigation.call(this, "out");
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
  if (this.destroyed) {
    return Promise.resolve(false);
  }
  if (this.viewportTransitionInProgress) {
    return queueNavigation.call(this, "redo");
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

function queueNavigation(direction) {
  return new Promise((resolve, reject) => {
    this.pendingNavigationQueue.push({ direction, reject, resolve });
  });
}

function settlePendingNavigationQueue(result) {
  this.pendingNavigationQueue
    .splice(0)
    .forEach(({ resolve }) => resolve(result));
}

function schedulePendingNavigation() {
  if (
    !this.pendingNavigationQueue.length ||
    this.pendingNavigationScheduled ||
    this.destroyed
  ) {
    if (this.destroyed && this.pendingNavigationQueue.length) {
      settlePendingNavigationQueue.call(this, false);
    }
    return;
  }

  this.pendingNavigationScheduled = true;
  setTimeout(() => {
    this.pendingNavigationScheduled = false;
    if (this.destroyed) {
      settlePendingNavigationQueue.call(this, false);
      return;
    }
    if (this.viewportTransitionInProgress) {
      // A new direct navigation won the gap between transitions. Its finalizer
      // will resume this queue without reordering the pending requests.
      return;
    }

    const pending = this.pendingNavigationQueue.shift();
    const navigation =
      pending.direction === "out" ? this.zoomOut() : this.undoZoomOut();
    navigation.then(pending.resolve, pending.reject).finally(() => {
      // A request with no available history resolves immediately and therefore
      // has no transition finalizer to schedule the next queued request.
      schedulePendingNavigation.call(this);
    });
  });
}
