import { reverseViewportTransform, viewportTransform } from "./viewport";
import { clearAll, clearRect, fillRect, fillText } from "./canvas";
import { onClickEventListener, onMouseMove } from "./interaction";
import { layoutLayer } from "./layout";
import { transitionTo, zoomIn, zoomOut } from "./transition";
import {
  clearRectAndPaintLayer,
  paintLayer,
  repaint,
  updateLayerFontSize,
} from "./paint";

export default class TreeBox {
  // members
  pixelRatio = 1;

  domElement;
  canvasElement;
  canvas2dContext;

  viewport = { x0: 0, x1: 0, y0: 0, y1: 0 };

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
  updateLayerFontSize = updateLayerFontSize.bind(this);

  // interactions
  onMouseMove = onMouseMove.bind(this);
  onClickEventListener = onClickEventListener.bind(this);

  // transitions
  transitionTo = transitionTo.bind(this);
  zoomIn = zoomIn.bind(this);
  zoomOut = zoomOut.bind(this);

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

  constructor({ data, domElement, eventHandler, pixelRatio = 1 }) {
    this.pixelRatio = pixelRatio;
    this.eventHandler = eventHandler;
    this.domElement = domElement;
    this.canvasElement = this.createCanvasElement(domElement);

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

    this.updateLayerFontSize(this.activeNode.children);
    this.paintLayer(this.activeNode.children, { hovering: false, depth: 0 });
    this.addEventListeners();
  }

  destroy() {
    this.removeEventListeners();
    this.canvasUtils.clearAll();
  }

  onMouseMoveEventListener = (e) => {
    this.onMouseMove(e.offsetX, e.offsetY);
    this.lastMousePos = { x: e.offsetX, y: e.offsetY };
  };

  addEventListeners() {
    this.canvasElement.addEventListener(
      "mousemove",
      this.onMouseMoveEventListener
    );
    this.canvasElement.addEventListener("click", this.onClickEventListener);
  }

  removeEventListeners() {
    this.canvasElement.removeEventListener(
      "mousemove",
      this.onMouseMoveEventListener
    );
    this.canvasElement.removeEventListener("click", this.onClickEventListener);
  }

  emitEvent(type, args) {
    if (!this.eventHandler) {
      return;
    }

    this.eventHandler(type, args);
  }

  createCanvasElement(domElement) {
    const rect = domElement.getBoundingClientRect();
    const canvas = document.createElement("CANVAS");
    canvas.width = rect.width * this.pixelRatio;
    canvas.height = rect.height * this.pixelRatio;
    domElement.appendChild(canvas);
    return canvas;
  }
}
