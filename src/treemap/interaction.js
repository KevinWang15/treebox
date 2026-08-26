import { normalizeViewport } from "./viewport";

function limitTo(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function onMouseMove({ x, y }) {
  const item = findItemAtPosition.call(this, { x, y });
  updateHoveredItem.call(this, item);

  if (
    this.isMouseDown &&
    this.lastMouseDownPos &&
    selectionAreaTriggered.call(this, { x, y })
  ) {
    this.selectionAreaWasTriggered = true;
    let x0 = limitTo(x, 0, this.domElementRect.width);
    let x1 = limitTo(this.lastMouseDownPos.x, 0, this.domElementRect.width);
    let y0 = limitTo(y, 0, this.domElementRect.height);
    let y1 = limitTo(this.lastMouseDownPos.y, 0, this.domElementRect.height);
    this.selectionAreaElement.style.display = "block";
    this.selectionAreaElement.style.top =
      Math.min(y0, y1) + this.domElementRect.top + "px";
    this.selectionAreaElement.style.left =
      Math.min(x0, x1) + this.domElementRect.left + "px";
    this.selectionAreaElement.style.width = Math.abs(x0 - x1) + "px";
    this.selectionAreaElement.style.height = Math.abs(y0 - y1) + "px";

    if (Math.abs(x0 - x1) * Math.abs(y0 - y1) < 400) {
      // ignore small selections
      this.selectionAreaViewPort = null;
    } else {
      this.selectionAreaViewPort = this.viewportUtils.reverseTransform(
        normalizeViewport({
          x0,
          y0,
          x1,
          y1,
        })
      );
    }
  }
}

export function updateHoveredItem(item) {
  if (item === this.lastHoveringItem) {
    return;
  }

  const previousItem = this.lastHoveringItem;
  if (previousItem) {
    this.clearRectAndPaintLayer(previousItem, {
      hovering: false,
      depth: 0,
    });
  }

  this.lastHoveringItem = item || null;
  this.canvasElement.style.cursor =
    item && item.children && item.children.length ? "pointer" : "default";

  if (item) {
    this.clearRectAndPaintLayer(item, { hovering: true, depth: 0 });
    this.emitEvent("hover", item);
  } else if (previousItem) {
    this.emitEvent("hover", null);
  }
}

function itemCenter(item) {
  return {
    x: (item.x0 + item.x1) / 2,
    y: (item.y0 + item.y1) / 2,
  };
}

export function findDirectionalItem(items, currentItem, key) {
  if (!items.length) {
    return null;
  }
  if (!currentItem || !items.includes(currentItem)) {
    return [...items].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)[0];
  }

  const direction = {
    ArrowRight: { axis: "x", crossAxis: "y", sign: 1 },
    ArrowDown: { axis: "y", crossAxis: "x", sign: 1 },
    ArrowLeft: { axis: "x", crossAxis: "y", sign: -1 },
    ArrowUp: { axis: "y", crossAxis: "x", sign: -1 },
  }[key];
  if (!direction) {
    return currentItem;
  }

  const currentCenter = itemCenter(currentItem);
  let bestItem = currentItem;
  let bestScore = Infinity;
  for (const item of items) {
    if (item === currentItem) {
      continue;
    }

    const center = itemCenter(item);
    const primaryDistance =
      (center[direction.axis] - currentCenter[direction.axis]) * direction.sign;
    if (primaryDistance <= 0) {
      continue;
    }

    const crossDistance = Math.abs(
      center[direction.crossAxis] - currentCenter[direction.crossAxis]
    );
    const score = primaryDistance + crossDistance * 2;
    if (score < bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestItem;
}

export function findItemAtPosition({ x, y }) {
  const transformed = this.viewportUtils.reverseTransform({
    x0: x,
    y0: y,
    x1: x,
    y1: y,
  });

  const tx = transformed.x0;
  const ty = transformed.y0;
  return (this.activeNode.children || []).find(
    (item) => item.x0 <= tx && item.x1 >= tx && item.y0 <= ty && item.y1 >= ty
  );
}

export function onClickEventListener(e) {
  if (this.selectionAreaWasTriggered) {
    this.selectionAreaWasTriggered = false;
    return;
  }
  if (e.detail > 1) {
    return;
  }
  if (this.viewportTransitionInProgress) {
    return;
  }
  if (this.transitionTargetNode) {
    return;
  }

  const target = findItemAtPosition.call(this, this.eventToCanvasPoint(e));
  if (!target || !target.children || !target.children.length) {
    return;
  }

  this.zoomIn(target);
}

export function onMouseDownEventListener(e) {
  if (e.isPrimary === false) {
    if (
      e.pointerType === "touch" &&
      this.isMouseDown &&
      this.activePointerType === "touch"
    ) {
      onPointerCancelEventListener.call(this, {
        pointerId: this.activePointerId,
      });
      // A multi-touch gesture must not finish as a click or area selection.
      this.selectionAreaWasTriggered = true;
    }
    return;
  }

  if (e.button !== 0 || this.viewportTransitionInProgress) {
    return;
  }

  this.isMouseDown = true;
  this.activePointerId = e.pointerId;
  this.activePointerType = e.pointerType || "mouse";
  this.selectionAreaWasTriggered = false;
  this.lastMouseDownPos = this.eventToCanvasPoint(e);
  if (
    e.pointerId !== undefined &&
    typeof this.canvasElement.setPointerCapture === "function"
  ) {
    this.canvasElement.setPointerCapture(e.pointerId);
  }
  if (this.activePointerType === "touch") {
    e.preventDefault();
  }
  this.canvasElement.focus({ preventScroll: true });
}

export function onMouseUpEventListener(e) {
  if (
    !this.isMouseDown ||
    (this.activePointerId !== undefined &&
      e.pointerId !== undefined &&
      e.pointerId !== this.activePointerId)
  ) {
    return;
  }

  const pointerType = this.activePointerType;
  const selectionAreaWasTriggered = this.selectionAreaWasTriggered;
  this.isMouseDown = false;
  this.selectionAreaElement.style.display = "none";
  const selectionAreaViewPort = this.selectionAreaViewPort;
  this.selectionAreaViewPort = null;
  this.lastMouseDownPos = null;
  if (
    this.activePointerId !== undefined &&
    typeof this.canvasElement.hasPointerCapture === "function" &&
    this.canvasElement.hasPointerCapture(this.activePointerId)
  ) {
    this.canvasElement.releasePointerCapture(this.activePointerId);
  }
  this.activePointerId = undefined;
  this.activePointerType = undefined;

  if (selectionAreaViewPort && !this.viewportTransitionInProgress) {
    this.viewportHistory.push({
      node: this.activeNode,
      viewport: selectionAreaViewPort,
    });
    this.viewportHistoryUndoStack.splice(0);
    this.transitionTo(selectionAreaViewPort).then(() => {
      if (!this.destroyed) {
        this.repaint();
        this.emitZoomEvent("select");
      }
    });
  } else if (
    pointerType === "touch" &&
    !selectionAreaWasTriggered &&
    !this.viewportTransitionInProgress
  ) {
    const point = this.eventToCanvasPoint(e);
    const target = findItemAtPosition.call(this, point);
    if (target && target.children && target.children.length) {
      const eventTime = e.timeStamp;
      const previousTouch = this.lastTouchActivation;
      const repeatedTouch =
        previousTouch &&
        eventTime - previousTouch[0] <= 300 &&
        Math.abs(point.x - previousTouch[1]) +
          Math.abs(point.y - previousTouch[2]) <=
          32;
      this.lastTouchActivation = [eventTime, point.x, point.y];
      if (repeatedTouch) {
        // Consume the synthetic click that follows this ignored second tap.
        this.selectionAreaWasTriggered = true;
        return;
      }
      this.zoomIn(target);
    }
  }
}

export function onPointerCancelEventListener(e) {
  if (
    !this.isMouseDown ||
    (this.activePointerId !== undefined &&
      e.pointerId !== undefined &&
      e.pointerId !== this.activePointerId)
  ) {
    return;
  }

  if (
    this.activePointerId !== undefined &&
    typeof this.canvasElement.hasPointerCapture === "function" &&
    this.canvasElement.hasPointerCapture(this.activePointerId)
  ) {
    this.canvasElement.releasePointerCapture(this.activePointerId);
  }
  this.isMouseDown = false;
  this.lastMouseDownPos = null;
  this.selectionAreaViewPort = null;
  this.selectionAreaWasTriggered = false;
  this.selectionAreaElement.style.display = "none";
  this.activePointerId = undefined;
  this.activePointerType = undefined;
}

export function onLostPointerCaptureEventListener(e) {
  if (
    !this.isMouseDown ||
    (this.activePointerId !== undefined &&
      e.pointerId !== undefined &&
      e.pointerId !== this.activePointerId)
  ) {
    return;
  }

  onPointerCancelEventListener.call(this, e);
  // The physical pointer can still release over the canvas and synthesize a
  // click after capture was revoked. Consume that stale activation.
  this.selectionAreaWasTriggered = true;
}

export function onWindowBlurEventListener() {
  if (!this.isMouseDown) {
    return;
  }

  onPointerCancelEventListener.call(this, {
    pointerId: this.activePointerId,
  });
  // A release after the window regains focus must not complete the canceled
  // drag or synthesize a zoom click.
  this.selectionAreaWasTriggered = true;
}

const WHEEL_NAVIGATION_THRESHOLD = 20;
const WHEEL_GESTURE_GAP = 250;

function normalizedWheelDelta(e) {
  if (e.deltaMode === 1) {
    return e.deltaY * 16;
  }
  if (e.deltaMode === 2) {
    return e.deltaY * this.domElementRect.height;
  }
  return e.deltaY;
}

export function onMouseWheelEventListener(e) {
  if (e.ctrlKey || e.metaKey) {
    return;
  }

  if (this.isMouseDown) {
    e.preventDefault();
    return;
  }

  const delta = normalizedWheelDelta.call(this, e);
  const direction = Math.sign(delta);
  if (!direction) {
    return;
  }

  const eventTime = Number.isFinite(e.timeStamp) ? e.timeStamp : Date.now();
  const continuedGesture =
    direction === this.wheelGestureDirection &&
    eventTime - this.wheelLastEventTime <= WHEEL_GESTURE_GAP;

  if (!continuedGesture) {
    this.wheelDeltaAccumulator = 0;
    this.wheelGestureDirection = 0;
  }
  this.wheelLastEventTime = eventTime;

  const canNavigate =
    direction > 0
      ? this.viewportHistory.length > 0
      : this.viewportHistoryUndoStack.length > 0;
  if (!canNavigate && !continuedGesture) {
    return;
  }

  e.preventDefault();
  this.wheelGestureDirection = direction;

  // Keep consuming momentum from a gesture that already navigated, even once
  // the current history entry has been popped for its transition.
  if (!canNavigate) {
    return;
  }

  this.wheelDeltaAccumulator += delta;
  if (Math.abs(this.wheelDeltaAccumulator) < WHEEL_NAVIGATION_THRESHOLD) {
    return;
  }

  this.wheelDeltaAccumulator = 0;
  if (direction > 0) {
    this.zoomOutThrottled();
  } else {
    this.undoZoomOutThrottled();
  }
}

export function onMouseLeaveEventListener() {
  this.lastMousePos = null;
  if (!this.lastHoveringItem) {
    return;
  }

  if (this.viewportTransitionInProgress) {
    this.lastHoveringItem = null;
    this.canvasElement.style.cursor = "default";
    this.emitEvent("hover", null);
    return;
  }

  updateHoveredItem.call(this, null);
}

export function onKeyDownEventListener(e) {
  if (
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    (e.shiftKey && e.key === "Escape")
  ) {
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    if (e.repeat) {
      return;
    }
    if (this.isMouseDown) {
      onPointerCancelEventListener.call(this, {
        pointerId: this.activePointerId,
      });
      // Releasing the physical pointer after a keyboard cancellation may still
      // synthesize a click. Consume that click instead of treating it as zoom.
      this.selectionAreaWasTriggered = true;
      return;
    }
    this.zoomOut();
    return;
  }

  if (e.repeat && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    return;
  }

  if (this.isMouseDown) {
    if (
      [
        "ArrowRight",
        "ArrowDown",
        "ArrowLeft",
        "ArrowUp",
        "Enter",
        " ",
      ].includes(e.key)
    ) {
      e.preventDefault();
    }
    return;
  }

  if (this.viewportTransitionInProgress) {
    if (e.key === "Enter" || e.key === " " || e.key.slice(0, 5) === "Arrow") {
      e.preventDefault();
    }
    return;
  }

  if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
    e.preventDefault();
    const items = this.activeNode.children || [];
    updateHoveredItem.call(
      this,
      findDirectionalItem(items, this.lastHoveringItem, e.key)
    );
    return;
  }

  if (e.key !== "Enter" && e.key !== " ") {
    return;
  }

  e.preventDefault();
  const selectedItem =
    this.lastHoveringItem || (this.activeNode.children || [])[0];
  if (selectedItem && selectedItem.children && selectedItem.children.length) {
    this.zoomIn(selectedItem);
  }
}

export function selectionAreaTriggered({ x, y }) {
  return (
    Boolean(this.lastMouseDownPos) &&
    Math.abs(x - this.lastMouseDownPos.x) +
      Math.abs(y - this.lastMouseDownPos.y) >
      this.SELECTION_AREA_TRIGGER_THRESHOLD
  );
}
