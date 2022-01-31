import { reverseViewportTransform, viewportTransform } from "./viewport";
import { clearAll, clearRect, fillRect, fillText } from "./canvas";
import {
  onClickEventListener,
  onMouseDownEventListener,
  onMouseMove,
  onMouseUpEventListener,
  onMouseWheelEventListener,
} from "./interaction";
import { layoutLayer } from "./layout";
import { transitionTo, undoZoomOut, zoomIn, zoomOut } from "./transition";
import { clearRectAndPaintLayer, paintLayer, repaint } from "./paint";
import { throttle } from "lodash-es";

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

  // painting the nodes
  paintLayer = paintLayer.bind(this);
  clearRectAndPaintLayer = clearRectAndPaintLayer.bind(this);
  repaint = repaint.bind(this);

  // interactions
  onMouseMove = onMouseMove.bind(this);
  onClickEventListener = onClickEventListener.bind(this);
  onMouseDownEventListener = onMouseDownEventListener.bind(this);
  onMouseUpEventListener = onMouseUpEventListener.bind(this);
  onMouseWheelEventListener = onMouseWheelEventListener.bind(this);

  // transitions
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

  // pixels between boxes
  BOX_MARGIN = 1;

  // how many pixels moved before drawing a selection area
  SELECTION_AREA_TRIGGER_THRESHOLD = 20;

  search = {
    element: null,
  };

  constructor({ data, domElement, eventHandler, pixelRatio = 1 }) {
    this.pixelRatio = pixelRatio;
    this.eventHandler = eventHandler;
    this.domElement = domElement;
    this.canvasElement = this.createCanvasElement(domElement);
    this.selectionAreaElement = this.createSelectionAreaElement();

    this.canvasElement.style.zoom = 1 / this.pixelRatio;
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

    this.paintLayer(this.activeNode.children, { hovering: false, depth: 0 });
    this.addEventListeners();
  }

  destroy() {
    this.removeEventListeners();
    this.canvasUtils.clearAll();
    this.selectionAreaElement.parentElement.removeChild(
      this.selectionAreaElement
    );
    this.canvasElement.parentElement.removeChild(this.canvasElement);
    this.domElement = null;
    this.canvasElement = null;
    this.canvas2dContext = null;
    this.viewportHistory = null;
    this.viewport = null;
  }

  onMouseMoveEventListener = (e) => {
    let x = e.pageX - this.domElementRect.left;
    let y = e.pageY - this.domElementRect.top;
    this.onMouseMove({ x, y });
    this.lastMousePos = {
      x,
      y,
    };
  };

  addEventListeners() {
    document.addEventListener("mousemove", this.onMouseMoveEventListener);
    document.addEventListener("mousedown", this.onMouseDownEventListener);
    document.addEventListener("mouseup", this.onMouseUpEventListener);
    document.addEventListener("wheel", this.onMouseWheelEventListener);
    this.canvasElement.addEventListener("click", this.onClickEventListener);
  }

  removeEventListeners() {
    document.removeEventListener("mousemove", this.onMouseMoveEventListener);
    document.removeEventListener("mousedown", this.onMouseDownEventListener);
    document.removeEventListener("mouseup", this.onMouseUpEventListener);
    document.removeEventListener("wheel", this.onMouseWheelEventListener);
    this.canvasElement.removeEventListener("click", this.onClickEventListener);
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
    canvas.width = this.domElementRect.width * this.pixelRatio;
    canvas.height = this.domElementRect.height * this.pixelRatio;
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
    });
    document.body.appendChild(element);
    return element;
  }

  showSearch() {
    if (!this.search.element) {
      this.search.element = document.createElement("div");
      this.search.element.className = "searchbox";
      const input = document.createElement("input");
      this.search.element.appendChild(input);
      this.domElement.appendChild(this.search.element);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.hideSearch();
          return;
        }
      });
    }
    const input = this.search.element.getElementsByTagName("input")[0];
    input.focus();
    input.select();
  }

  hideSearch() {
    if (!this.search.element) {
      return;
    }
    this.search.element.parentElement.removeChild(this.search.element);
    this.search.element = null;
  }
}
