import { reverseViewportTransform, viewportTransform } from "./viewport";
import { clearAll, clearRect, fillRect, fillText } from "./canvas";
import {
  onClickEventListener,
  flushPendingClick,
  onKeyDownEventListener,
  onLostPointerCaptureEventListener,
  onMouseDownEventListener,
  onMouseLeaveEventListener,
  onMouseMove,
  onMouseUpEventListener,
  onMouseWheelEventListener,
  onPointerCancelEventListener,
  onScrollEventListener,
  onWindowBlurEventListener,
} from "./interaction";
import { layoutLayer, validateHierarchy } from "./layout";
import {
  emitZoomEvent,
  repaintHoveredItem,
  transitionTo,
  undoZoomOut,
  zoomIn,
  zoomOut,
} from "./transition";
import { clearRectAndPaintLayer, paintLayer, repaint, resize } from "./paint";
import throttle from "./throttle";

function normalizePixelRatio(pixelRatio) {
  return Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
}

export default class TreeBox {
  // members
  pixelRatio = 1;

  domElement;
  canvasElement;
  selectionAreaElement;
  canvas2dContext;

  viewport = { x0: 0, x1: 0, y0: 0, y1: 0 };
  viewportHistory = [];
  viewportHistoryUndoStack = [];

  // root node of user input
  rootNode;

  // the node that is zoomed-in on
  activeNode;

  // if in a transition, which node are we transitioning to
  transitionTargetNode = null;
  viewportTransitionInProgress = false;
  resizePending = false;
  pendingNavigationScheduled = false;
  pendingNavigationQueue = [];
  wheelDeltaAccumulator = 0;
  wheelGestureDirection = 0;
  wheelLastEventTime = 0;
  destroyed = false;
  domElementRectFresh = false;
  domElementRectRefreshFrame = null;
  hitTestIndex = null;
  pendingClickPoint = null;
  pendingClickTimer = null;

  // painting the nodes
  paintLayer = paintLayer.bind(this);
  clearRectAndPaintLayer = clearRectAndPaintLayer.bind(this);
  repaint = repaint.bind(this);
  resize = resize.bind(this);

  // interactions
  onMouseMove = onMouseMove.bind(this);
  onClickEventListener = onClickEventListener.bind(this);
  flushPendingClick = flushPendingClick.bind(this);
  onKeyDownEventListener = onKeyDownEventListener.bind(this);
  onLostPointerCaptureEventListener =
    onLostPointerCaptureEventListener.bind(this);
  onMouseDownEventListener = onMouseDownEventListener.bind(this);
  onMouseLeaveEventListener = onMouseLeaveEventListener.bind(this);
  onMouseUpEventListener = onMouseUpEventListener.bind(this);
  onMouseWheelEventListener = onMouseWheelEventListener.bind(this);
  onPointerCancelEventListener = onPointerCancelEventListener.bind(this);
  onScrollEventListener = onScrollEventListener.bind(this);
  onWindowBlurEventListener = onWindowBlurEventListener.bind(this);

  // transitions
  emitZoomEvent = emitZoomEvent.bind(this);
  repaintHoveredItem = repaintHoveredItem.bind(this);
  transitionTo = transitionTo.bind(this);
  zoomIn = zoomIn.bind(this);
  zoomOut = zoomOut.bind(this);
  zoomOutThrottled = throttle(this.zoomOut, 350, {
    leading: true,
    trailing: false,
  });
  undoZoomOut = undoZoomOut.bind(this);
  undoZoomOutThrottled = throttle(this.undoZoomOut, 350, {
    leading: true,
    trailing: false,
  });

  // canvas utils
  canvasUtils = {
    fillText: fillText.bind(this),
    fillRect: fillRect.bind(this),
    clearAll: clearAll.bind(this),
    clearRect: clearRect.bind(this),
  };

  // viewport utils
  viewportUtils = {
    transform: viewportTransform.bind(this),
    reverseTransform: reverseViewportTransform.bind(this),
  };

  // CSS pixels between boxes
  BOX_MARGIN = 1;

  // how many pixels moved before drawing a selection area
  SELECTION_AREA_TRIGGER_THRESHOLD = 20;

  wheelListenerOptions = { passive: false };

  constructor({ data, domElement, eventHandler, pixelRatio = 1 }) {
    if (!domElement || typeof domElement.appendChild !== "function") {
      throw new TypeError("TreeBox requires a valid domElement");
    }
    if (!Array.isArray(data)) {
      throw new TypeError("TreeBox data must be an array");
    }
    if (eventHandler != null && typeof eventHandler !== "function") {
      throw new TypeError("TreeBox eventHandler must be a function");
    }
    validateHierarchy(data);

    this.pixelRatio = normalizePixelRatio(pixelRatio);
    this.eventHandler = eventHandler;
    this.domElement = domElement;
    try {
      this.canvasElement = this.createCanvasElement(domElement);
      this.selectionAreaElement = this.createSelectionAreaElement();

      this.rootNode = {
        children: data,
        x0: 0,
        y0: 0,
        x1: this.domElement.clientWidth,
        y1: this.domElement.clientHeight,
      };
      this.activeNode = this.rootNode;
      this.canvas2dContext = this.canvasElement.getContext("2d");

      Object.assign(this.viewport, {
        x0: 0,
        y0: 0,
        x1: this.domElement.clientWidth,
        y1: this.domElement.clientHeight,
      });
      layoutLayer(this.activeNode.children, {
        ...this.viewport,
        depth: 0,
      });

      if (this.rootNode.x1 > 0 && this.rootNode.y1 > 0) {
        this.paintLayer(this.activeNode.children, {
          hovering: false,
          depth: 0,
        });
      }
      this.addEventListeners();
      if (typeof ResizeObserver === "function") {
        this.resizeObserver = new ResizeObserver(() => this.repaint());
        this.resizeObserver.observe(this.domElement);
      }
    } catch (error) {
      this.cleanupFailedConstruction();
      throw error;
    }
  }

  cleanupFailedConstruction() {
    this.destroyed = true;
    this.cancelPendingClick();
    if (this.canvasElement) {
      this.removeEventListeners();
    }
    this.zoomOutThrottled.cancel();
    this.undoZoomOutThrottled.cancel();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.cancelDomElementRectRefresh();
    if (this.selectionAreaElement?.parentElement) {
      this.selectionAreaElement.parentElement.removeChild(
        this.selectionAreaElement,
      );
    }
    if (this.canvasElement?.parentElement) {
      this.canvasElement.parentElement.removeChild(this.canvasElement);
    }
    this.domElement = null;
    this.canvasElement = null;
    this.selectionAreaElement = null;
    this.canvas2dContext = null;
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.cancelPendingClick();
    this.removeEventListeners();
    this.zoomOutThrottled.cancel();
    this.undoZoomOutThrottled.cancel();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.cancelDomElementRectRefresh();
    this.canvasUtils.clearAll();
    if (this.selectionAreaElement.parentElement) {
      this.selectionAreaElement.parentElement.removeChild(
        this.selectionAreaElement,
      );
    }
    if (this.canvasElement.parentElement) {
      this.canvasElement.parentElement.removeChild(this.canvasElement);
    }
    this.domElement = null;
    this.canvasElement = null;
    this.canvas2dContext = null;
    this.hitTestIndex = null;
    this.viewportHistory = null;
    this.viewport = null;
  }

  setPixelRatio(pixelRatio) {
    if (this.destroyed) {
      return false;
    }

    const nextPixelRatio = normalizePixelRatio(pixelRatio);
    if (nextPixelRatio === this.pixelRatio) {
      return false;
    }

    this.pixelRatio = nextPixelRatio;
    this.repaint();
    return true;
  }

  onMouseMoveEventListener = (e) => {
    if (
      this.isMouseDown &&
      this.activePointerId !== undefined &&
      e.pointerId !== undefined &&
      e.pointerId !== this.activePointerId
    ) {
      return;
    }

    const { x, y } = this.eventToCanvasPoint(e);
    this.onMouseMove({ x, y });
    this.lastMousePos = {
      x,
      y,
    };
  };

  eventToCanvasPoint(e) {
    this.refreshDomElementRect();
    return {
      x: e.clientX - this.domElementRect.left,
      y: e.clientY - this.domElementRect.top,
    };
  }

  invalidateDomElementRect() {
    this.domElementRectFresh = false;
  }

  refreshDomElementRect({ force = false } = {}) {
    if (force || !this.domElementRectFresh) {
      this.domElementRect = this.canvasElement.getBoundingClientRect();
      this.domElementRectFresh = true;
    }
    if (this.domElementRectRefreshFrame === null) {
      const expire = () => {
        this.domElementRectRefreshFrame = null;
        this.domElementRectFresh = false;
      };
      if (typeof requestAnimationFrame === "function") {
        this.domElementRectRefreshFrame = requestAnimationFrame(expire);
      } else {
        this.domElementRectRefreshFrame = true;
        Promise.resolve().then(expire);
      }
    }
    return this.domElementRect;
  }

  cancelDomElementRectRefresh() {
    if (
      this.domElementRectRefreshFrame !== null &&
      this.domElementRectRefreshFrame !== true &&
      typeof cancelAnimationFrame === "function"
    ) {
      cancelAnimationFrame(this.domElementRectRefreshFrame);
    }
    this.domElementRectRefreshFrame = null;
    this.domElementRectFresh = false;
  }

  cancelPendingClick() {
    if (this.pendingClickTimer !== null) {
      clearTimeout(this.pendingClickTimer);
    }
    this.pendingClickTimer = null;
    this.pendingClickPoint = null;
  }

  addEventListeners() {
    this.canvasElement.addEventListener(
      "pointermove",
      this.onMouseMoveEventListener,
    );
    this.canvasElement.addEventListener(
      "pointerdown",
      this.onMouseDownEventListener,
    );
    this.canvasElement.addEventListener(
      "pointerleave",
      this.onMouseLeaveEventListener,
    );
    this.canvasElement.addEventListener(
      "lostpointercapture",
      this.onLostPointerCaptureEventListener,
    );
    this.canvasElement.addEventListener("blur", this.onMouseLeaveEventListener);
    window.addEventListener("blur", this.onWindowBlurEventListener);
    window.addEventListener("scroll", this.onScrollEventListener, true);
    document.addEventListener("pointerup", this.onMouseUpEventListener);
    document.addEventListener(
      "pointercancel",
      this.onPointerCancelEventListener,
    );
    this.canvasElement.addEventListener(
      "wheel",
      this.onMouseWheelEventListener,
      this.wheelListenerOptions,
    );
    this.canvasElement.addEventListener("click", this.onClickEventListener);
    this.canvasElement.addEventListener("keydown", this.onKeyDownEventListener);
  }

  removeEventListeners() {
    this.canvasElement.removeEventListener(
      "pointermove",
      this.onMouseMoveEventListener,
    );
    this.canvasElement.removeEventListener(
      "pointerdown",
      this.onMouseDownEventListener,
    );
    this.canvasElement.removeEventListener(
      "pointerleave",
      this.onMouseLeaveEventListener,
    );
    this.canvasElement.removeEventListener(
      "lostpointercapture",
      this.onLostPointerCaptureEventListener,
    );
    this.canvasElement.removeEventListener(
      "blur",
      this.onMouseLeaveEventListener,
    );
    window.removeEventListener("blur", this.onWindowBlurEventListener);
    window.removeEventListener("scroll", this.onScrollEventListener, true);
    document.removeEventListener("pointerup", this.onMouseUpEventListener);
    document.removeEventListener(
      "pointercancel",
      this.onPointerCancelEventListener,
    );
    this.canvasElement.removeEventListener(
      "wheel",
      this.onMouseWheelEventListener,
      this.wheelListenerOptions,
    );
    this.canvasElement.removeEventListener("click", this.onClickEventListener);
    this.canvasElement.removeEventListener(
      "keydown",
      this.onKeyDownEventListener,
    );
  }

  emitEvent(type, args) {
    if (!this.eventHandler) {
      return;
    }

    this.eventHandler(type, args);
  }

  createCanvasElement(domElement) {
    this.domElementRect = domElement.getBoundingClientRect();
    const canvas = document.createElement("CANVAS");
    canvas.width = Math.round(domElement.clientWidth * this.pixelRatio);
    canvas.height = Math.round(domElement.clientHeight * this.pixelRatio);
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute(
      "aria-label",
      "Interactive treemap. Tap or click a group to zoom in. With a keyboard, use the arrow keys to choose a group, Enter to zoom in, and Escape to zoom out.",
    );
    canvas.style.display = "block";
    canvas.style.width = domElement.clientWidth + "px";
    canvas.style.height = domElement.clientHeight + "px";
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    domElement.appendChild(canvas);
    return canvas;
  }

  createSelectionAreaElement() {
    const element = document.createElement("div");
    Object.assign(element.style, {
      pointerEvents: "none",
      border: "1px solid rgba(98, 155, 255, 0.81)",
      borderRadius: "5px",
      boxSizing: "border-box",
      background: "rgba(46, 115, 252, 0.11)",
      backdropFilter: "sepia(70%)",
      position: "fixed",
      display: "none",
    });
    document.body.appendChild(element);
    return element;
  }
}
