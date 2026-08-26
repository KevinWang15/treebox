import {
  findDirectionalItem,
  onClickEventListener,
  onKeyDownEventListener,
  onMouseLeaveEventListener,
  onMouseDownEventListener,
  onMouseUpEventListener,
  onMouseWheelEventListener,
  updateHoveredItem,
} from "./interaction";

function createWheelEvent(deltaY, timeStamp = 0, deltaMode = 0) {
  return { deltaMode, deltaY, preventDefault: jest.fn(), timeStamp };
}

test("ignores repeated clicks so a double-click cannot skip a level", () => {
  const context = {
    selectionAreaWasTriggered: false,
    viewportTransitionInProgress: false,
    transitionTargetNode: null,
    eventToCanvasPoint: jest.fn(),
    zoomIn: jest.fn(),
  };

  onClickEventListener.call(context, { detail: 2 });

  expect(context.eventToCanvasPoint).not.toHaveBeenCalled();
  expect(context.zoomIn).not.toHaveBeenCalled();
});

test("allows normal page scrolling when there is no zoom history", () => {
  const context = {
    viewportHistory: [],
    viewportHistoryUndoStack: [],
    zoomOutThrottled: jest.fn(),
    undoZoomOutThrottled: jest.fn(),
  };
  const event = createWheelEvent(120);

  onMouseWheelEventListener.call(context, event);

  expect(event.preventDefault).not.toHaveBeenCalled();
  expect(context.zoomOutThrottled).not.toHaveBeenCalled();
});

test.each(["ctrlKey", "metaKey"])(
  "allows browser zoom with the %s wheel modifier",
  (modifier) => {
    const context = {
      viewportHistory: [{}],
      viewportHistoryUndoStack: [{}],
      zoomOutThrottled: jest.fn(),
      undoZoomOutThrottled: jest.fn(),
    };
    const event = createWheelEvent(120);
    event[modifier] = true;

    onMouseWheelEventListener.call(context, event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(context.zoomOutThrottled).not.toHaveBeenCalled();
    expect(context.undoZoomOutThrottled).not.toHaveBeenCalled();
  }
);

test("consumes a wheel gesture when it can navigate zoom history", () => {
  const context = {
    viewportHistory: [{}],
    viewportHistoryUndoStack: [],
    zoomOutThrottled: jest.fn(),
    undoZoomOutThrottled: jest.fn(),
  };
  const event = createWheelEvent(120);

  onMouseWheelEventListener.call(context, event);

  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  expect(context.zoomOutThrottled).toHaveBeenCalledTimes(1);
});

test("accumulates high-resolution wheel deltas without scrolling the page", () => {
  const context = {
    viewportHistory: [{}],
    viewportHistoryUndoStack: [],
    zoomOutThrottled: jest.fn(),
    undoZoomOutThrottled: jest.fn(),
  };
  const events = [
    createWheelEvent(5, 100),
    createWheelEvent(5, 120),
    createWheelEvent(5, 140),
    createWheelEvent(5, 160),
  ];

  events.forEach((event) => onMouseWheelEventListener.call(context, event));

  events.forEach((event) =>
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  );
  expect(context.zoomOutThrottled).toHaveBeenCalledTimes(1);
});

test("consumes the remaining momentum after wheel navigation starts", () => {
  const context = {
    viewportHistory: [{}],
    viewportHistoryUndoStack: [],
    zoomOutThrottled: jest.fn(),
    undoZoomOutThrottled: jest.fn(),
  };
  onMouseWheelEventListener.call(context, createWheelEvent(25, 100));
  context.viewportHistory = [];
  const momentumEvent = createWheelEvent(5, 140);

  onMouseWheelEventListener.call(context, momentumEvent);

  expect(momentumEvent.preventDefault).toHaveBeenCalledTimes(1);
  expect(context.zoomOutThrottled).toHaveBeenCalledTimes(1);

  const laterEvent = createWheelEvent(5, 500);
  onMouseWheelEventListener.call(context, laterEvent);
  expect(laterEvent.preventDefault).not.toHaveBeenCalled();
});

test("does not start wheel navigation during an active selection", () => {
  const context = {
    isMouseDown: true,
    viewportHistory: [{}],
    viewportHistoryUndoStack: [],
    zoomOutThrottled: jest.fn(),
    undoZoomOutThrottled: jest.fn(),
  };
  const event = createWheelEvent(120);

  onMouseWheelEventListener.call(context, event);

  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  expect(context.zoomOutThrottled).not.toHaveBeenCalled();
});

test("cancels a touch selection when another finger arrives", () => {
  const context = {
    isMouseDown: true,
    activePointerId: 7,
    activePointerType: "touch",
    lastMouseDownPos: { x: 10, y: 10 },
    selectionAreaViewPort: { x0: 10, x1: 90, y0: 10, y1: 90 },
    selectionAreaWasTriggered: true,
    selectionAreaElement: { style: { display: "block" } },
    canvasElement: {
      hasPointerCapture: jest.fn(() => true),
      releasePointerCapture: jest.fn(),
    },
  };

  onMouseDownEventListener.call(context, {
    button: 0,
    isPrimary: false,
    pointerId: 8,
    pointerType: "touch",
  });

  expect(context.isMouseDown).toBe(false);
  expect(context.activePointerId).toBeUndefined();
  expect(context.activePointerType).toBeUndefined();
  expect(context.lastMouseDownPos).toBeNull();
  expect(context.selectionAreaViewPort).toBeNull();
  expect(context.selectionAreaWasTriggered).toBe(true);
  expect(context.selectionAreaElement.style.display).toBe("none");
  expect(context.canvasElement.releasePointerCapture).toHaveBeenCalledWith(7);
});

test("chooses keyboard targets by rendered direction", () => {
  const topLeft = { x0: 0, x1: 10, y0: 0, y1: 10 };
  const right = { x0: 20, x1: 30, y0: 0, y1: 10 };
  const down = { x0: 0, x1: 10, y0: 20, y1: 30 };
  const diagonal = { x0: 20, x1: 30, y0: 20, y1: 30 };
  const items = [diagonal, down, right, topLeft];

  expect(findDirectionalItem(items, null, "ArrowRight")).toBe(topLeft);
  expect(findDirectionalItem(items, topLeft, "ArrowRight")).toBe(right);
  expect(findDirectionalItem(items, topLeft, "ArrowDown")).toBe(down);
  expect(findDirectionalItem(items, right, "ArrowLeft")).toBe(topLeft);
  expect(findDirectionalItem(items, topLeft, "ArrowLeft")).toBe(topLeft);
});

test("emits a null hover payload when the active item is cleared", () => {
  const item = { x0: 0, x1: 10, y0: 0, y1: 10 };
  const context = {
    lastHoveringItem: item,
    canvasElement: { style: {} },
    clearRectAndPaintLayer: jest.fn(),
    emitEvent: jest.fn(),
  };

  updateHoveredItem.call(context, null);

  expect(context.lastHoveringItem).toBeNull();
  expect(context.clearRectAndPaintLayer).toHaveBeenCalledWith(item, {
    hovering: false,
    depth: 0,
  });
  expect(context.emitEvent).toHaveBeenCalledWith("hover", null);
});

test("forgets stale pointer coordinates when leave occurs during animation", () => {
  const context = {
    lastHoveringItem: {},
    lastMousePos: { x: 20, y: 20 },
    viewportTransitionInProgress: true,
    canvasElement: { style: { cursor: "pointer" } },
    emitEvent: jest.fn(),
  };

  onMouseLeaveEventListener.call(context);

  expect(context.lastMousePos).toBeNull();
  expect(context.lastHoveringItem).toBeNull();
  expect(context.canvasElement.style.cursor).toBe("default");
  expect(context.emitEvent).toHaveBeenCalledWith("hover", null);
});

test("emits navigation state after selection zoom", async () => {
  const selectionViewport = { x0: 10, x1: 90, y0: 10, y1: 90 };
  const context = {
    isMouseDown: true,
    activeNode: { children: [] },
    activePointerId: undefined,
    activePointerType: "mouse",
    lastMouseDownPos: { x: 10, y: 10 },
    selectionAreaViewPort: selectionViewport,
    selectionAreaElement: { style: { display: "block" } },
    viewportHistory: [],
    viewportHistoryUndoStack: [{}],
    transitionTo: jest.fn(() => Promise.resolve()),
    repaint: jest.fn(),
    emitZoomEvent: jest.fn(),
    destroyed: false,
  };

  onMouseUpEventListener.call(context, {});
  await Promise.resolve();

  expect(context.viewportHistory).toEqual([
    { node: context.activeNode, viewport: selectionViewport },
  ]);
  expect(context.viewportHistoryUndoStack).toHaveLength(0);
  expect(context.repaint).toHaveBeenCalledTimes(1);
  expect(context.emitZoomEvent).toHaveBeenCalledWith("select");
});

test("ignores a repeated touch activation at the same position", () => {
  const target = {
    children: [{}],
    x0: 0,
    x1: 20,
    y0: 0,
    y1: 20,
  };
  const context = {
    isMouseDown: true,
    activeNode: { children: [target] },
    activePointerId: undefined,
    activePointerType: "touch",
    lastMouseDownPos: { x: 10, y: 10 },
    selectionAreaElement: { style: { display: "none" } },
    selectionAreaWasTriggered: false,
    selectionAreaViewPort: null,
    viewportTransitionInProgress: false,
    viewportUtils: { reverseTransform: (point) => point },
    eventToCanvasPoint: jest.fn(() => ({ x: 10, y: 10 })),
    lastTouchActivation: [100, 10, 10],
    zoomIn: jest.fn(),
  };

  onMouseUpEventListener.call(context, { timeStamp: 200 });

  expect(context.zoomIn).not.toHaveBeenCalled();
  expect(context.selectionAreaWasTriggered).toBe(true);
  expect(context.lastTouchActivation).toEqual([200, 10, 10]);
});

test("discards a selection if another transition has started", () => {
  const selectionViewport = { x0: 10, x1: 90, y0: 10, y1: 90 };
  const context = {
    isMouseDown: true,
    activeNode: { children: [] },
    activePointerId: undefined,
    activePointerType: "mouse",
    lastMouseDownPos: { x: 10, y: 10 },
    selectionAreaViewPort: selectionViewport,
    selectionAreaElement: { style: { display: "block" } },
    viewportHistory: [{}],
    viewportHistoryUndoStack: [],
    viewportTransitionInProgress: true,
    transitionTo: jest.fn(),
  };

  onMouseUpEventListener.call(context, {});

  expect(context.viewportHistory).toHaveLength(1);
  expect(context.transitionTo).not.toHaveBeenCalled();
  expect(context.selectionAreaElement.style.display).toBe("none");
});

test("cancels an active selection when Escape is pressed", () => {
  const context = {
    isMouseDown: true,
    activePointerId: 7,
    activePointerType: "mouse",
    lastMouseDownPos: { x: 10, y: 10 },
    selectionAreaViewPort: { x0: 10, x1: 90, y0: 10, y1: 90 },
    selectionAreaWasTriggered: true,
    selectionAreaElement: { style: { display: "block" } },
    canvasElement: {
      hasPointerCapture: jest.fn(() => true),
      releasePointerCapture: jest.fn(),
    },
    zoomOut: jest.fn(),
  };
  const event = { key: "Escape", preventDefault: jest.fn() };

  onKeyDownEventListener.call(context, event);

  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  expect(context.zoomOut).not.toHaveBeenCalled();
  expect(context.isMouseDown).toBe(false);
  expect(context.selectionAreaViewPort).toBeNull();
  expect(context.selectionAreaWasTriggered).toBe(true);
  expect(context.selectionAreaElement.style.display).toBe("none");
  expect(context.canvasElement.releasePointerCapture).toHaveBeenCalledWith(7);
});

test("ignores Escape auto-repeat so one held key steps out once", () => {
  const context = {
    isMouseDown: false,
    zoomOut: jest.fn(),
  };
  const event = { key: "Escape", repeat: true, preventDefault: jest.fn() };

  onKeyDownEventListener.call(context, event);

  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  expect(context.zoomOut).not.toHaveBeenCalled();
});

test.each(["Enter", " "])("ignores a repeated %p activation keydown", (key) => {
  const context = {
    isMouseDown: false,
    viewportTransitionInProgress: false,
    activeNode: { children: [{ children: [{}] }] },
    zoomIn: jest.fn(),
  };
  const event = {
    key,
    repeat: true,
    preventDefault: jest.fn(),
  };

  onKeyDownEventListener.call(context, event);

  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  expect(context.zoomIn).not.toHaveBeenCalled();
});

test.each(["ArrowDown", "Enter", " "])(
  "consumes %p while a viewport transition is active",
  (key) => {
    const event = { key, repeat: false, preventDefault: jest.fn() };

    onKeyDownEventListener.call(
      { isMouseDown: false, viewportTransitionInProgress: true },
      event
    );

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  }
);
