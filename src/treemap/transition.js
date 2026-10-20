import { calcTransitioningViewport, isUsableViewport } from "./viewport";

export function transitionTo(viewport) {
  if (this.destroyed) {
    return Promise.resolve(false);
  }
  if (!isUsableViewport(viewport)) {
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
    let animationFrameId = null;
    let settled = false;

    const settle = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resolve(result);
    };

    const paintFrame = (progress) => {
      Object.assign(
        this.viewport,
        calcTransitioningViewport(pristineViewport, viewport, progress),
      );
      this.canvasUtils.clearAll();
      this.paintLayer(this.activeNode.children, {
        hovering: false,
        transitionProgress: progress,
        depth: 0,
      });
    };

    const finish = () => {
      if (this.destroyed) {
        settle(false);
        return;
      }
      paintFrame(1);
      settle(true);
    };

    const onAnimationFrame = () => {
      animationFrameId = null;
      if (this.destroyed) {
        settle(false);
        return;
      }

      const progress = Math.min(
        transitionLength
          ? (+new Date() - transitionStart) / transitionLength
          : 1,
        1,
      );
      paintFrame(progress);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(onAnimationFrame);
      } else {
        settle(true);
      }
    };

    function onVisibilityChange() {
      if (document.hidden) {
        finish();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (document.hidden) {
      finish();
    } else {
      animationFrameId = requestAnimationFrame(onAnimationFrame);
    }
  }).finally(() => {
    this.viewportTransitionInProgress = false;
    if (this.resizePending && !this.destroyed) {
      this.resizePending = false;
      this.resize();
    }
    schedulePendingNavigation.call(this);
    this.flushPendingClick?.();
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
    !isUsableViewport(targetNode) ||
    this.viewportTransitionInProgress
  ) {
    return Promise.resolve(false);
  }

  this.transitionTargetNode = targetNode;
  this.transitionReveals = new Set([targetNode]);
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
    finishNavigation.call(this, "in");
    return true;
  });
}

// Zooms to any item in the tree, or back to the top for null, the way a
// series of clicks and zoom-outs would get there. It's for keeping the treemap
// in step with state outside it, so it replaces the zoom history (including
// area selections) with the path down to the item, and its zoom event's
// direction is "to". Items without children can be zoomed to as well; they
// fill the canvas.
export function zoomTo(item, { animate = true } = {}) {
  if (this.destroyed) {
    return Promise.resolve(false);
  }
  const target = item ?? this.rootNode;
  const path = findPath(this.rootNode, target);
  if (!path || !isUsableViewport(target)) {
    return Promise.resolve(false);
  }
  if (this.viewportTransitionInProgress) {
    return queueNavigation.call(this, () => this.zoomTo(item, { animate }));
  }

  const current = this.viewportHistory[this.viewportHistory.length - 1];
  const arrived = current
    ? current.node === target && current.viewport === target
    : target === this.rootNode;
  if (arrived) {
    return Promise.resolve(true);
  }

  // The animation starts from the deepest item on both the current path and
  // the new one, and reveals every level below it down to the target.
  const activePath = findPath(this.rootNode, this.activeNode) ?? [];
  let shared = 0;
  while (shared < path.length && path[shared] === activePath[shared]) {
    shared++;
  }
  const common = shared ? path[shared - 1] : this.rootNode;

  this.viewportHistory.splice(
    0,
    this.viewportHistory.length,
    ...path.map((node) => ({ node, viewport: node })),
  );
  this.viewportHistoryUndoStack.splice(0);

  if (!animate) {
    this.activeNode = target;
    Object.assign(this.viewport, {
      x0: target.x0,
      x1: target.x1,
      y0: target.y0,
      y1: target.y1,
    });
    finishNavigation.call(this, "to");
    return Promise.resolve(true);
  }

  this.activeNode = common;
  this.transitionTargetNode = target;
  this.transitionReveals = new Set(path.slice(shared));
  return this.transitionTo(target).then(() => {
    if (this.destroyed) {
      return false;
    }

    this.activeNode = target;
    finishNavigation.call(this, "to");
    return true;
  });
}

// The items from just below the root down to `target`: [] for the root itself,
// null when it isn't in the tree.
function findPath(root, target) {
  if (target === root) {
    return [];
  }
  for (const child of root.children || []) {
    const below = findPath(child, target);
    if (below) {
      return [child, ...below];
    }
  }
  return null;
}

function finishNavigation(direction) {
  this.transitionTargetNode = null;
  this.transitionReveals = null;
  this.lastHoveringItem = null;
  this.repaint();
  repaintHoveredItem.call(this);
  this.emitZoomEvent(direction);
}

export function zoomOut() {
  if (this.destroyed) {
    return Promise.resolve(false);
  }
  if (this.viewportTransitionInProgress) {
    return queueNavigation.call(this, () => this.zoomOut());
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

    finishNavigation.call(this, "out");
    return true;
  });
}

export function undoZoomOut() {
  if (this.destroyed) {
    return Promise.resolve(false);
  }
  if (this.viewportTransitionInProgress) {
    return queueNavigation.call(this, () => this.undoZoomOut());
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
  this.transitionReveals = new Set([lastNodeAndViewport.node]);

  return this.transitionTo(lastNodeAndViewport.viewport).then(() => {
    if (this.destroyed) {
      return false;
    }

    this.activeNode = lastNodeAndViewport.node;
    finishNavigation.call(this, "redo");
    return true;
  });
}

export function repaintHoveredItem() {
  if (!this.lastMousePos) {
    return;
  }

  setTimeout(() => {
    if (!this.destroyed && this.lastMousePos) {
      this.onMouseMove(this.lastMousePos);
    }
  });
}

// Holds a navigation requested during a transition until it settles.
function queueNavigation(navigate) {
  return new Promise((resolve, reject) => {
    this.pendingNavigationQueue.push({ navigate, reject, resolve });
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
    pending
      .navigate()
      .then(pending.resolve, pending.reject)
      .finally(() => {
        // A request with no available history resolves immediately and therefore
        // has no transition finalizer to schedule the next queued request.
        schedulePendingNavigation.call(this);
      });
  });
}
