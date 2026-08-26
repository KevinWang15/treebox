import {
  emitZoomEvent,
  transitionTo,
  undoZoomOut,
  zoomIn,
  zoomOut,
} from "./transition";

test("rejects degenerate zoom targets before changing navigation state", async () => {
  const target = {
    children: [{}],
    x0: 10,
    x1: 10,
    y0: 20,
    y1: 80,
  };
  const context = {
    destroyed: false,
    transitionTargetNode: null,
    transitionTo: jest.fn(),
    viewportHistory: [],
    viewportHistoryUndoStack: [],
    viewportTransitionInProgress: false,
  };

  await expect(zoomIn.call(context, target)).resolves.toBe(false);
  expect(context.transitionTo).not.toHaveBeenCalled();
  expect(context.transitionTargetNode).toBeNull();
  expect(context.viewportHistory).toHaveLength(0);
});

test("ignores direct transitions to degenerate viewports", async () => {
  const context = {
    destroyed: false,
    viewportTransitionInProgress: false,
  };

  await expect(
    transitionTo.call(context, { x0: 10, x1: 10, y0: 20, y1: 80 })
  ).resolves.toBe(false);
  expect(context.viewportTransitionInProgress).toBe(false);
});

test("finishes a transition immediately when the document is hidden", async () => {
  const originalHidden = Object.getOwnPropertyDescriptor(document, "hidden");
  const originalAnimationFrame = global.requestAnimationFrame;
  global.requestAnimationFrame = jest.fn();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  const context = {
    activeNode: { children: [] },
    canvasUtils: { clearAll: jest.fn() },
    destroyed: false,
    paintLayer: jest.fn(),
    pendingNavigationQueue: [],
    pendingNavigationScheduled: false,
    resizePending: false,
    viewport: { x0: 0, x1: 100, y0: 0, y1: 100 },
    viewportTransitionInProgress: false,
  };
  const target = { x0: 20, x1: 80, y0: 10, y1: 90 };

  try {
    await expect(transitionTo.call(context, target)).resolves.toBe(true);

    expect(context.viewport).toEqual(target);
    expect(context.paintLayer).toHaveBeenCalledWith([], {
      hovering: false,
      transitionProgress: 1,
      depth: 0,
    });
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    expect(context.viewportTransitionInProgress).toBe(false);
  } finally {
    global.requestAnimationFrame = originalAnimationFrame;
    if (originalHidden) {
      Object.defineProperty(document, "hidden", originalHidden);
    } else {
      delete document.hidden;
    }
  }
});

test("finishes an active transition when the document becomes hidden", async () => {
  const originalHidden = Object.getOwnPropertyDescriptor(document, "hidden");
  const originalAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  global.requestAnimationFrame = jest.fn(() => 42);
  global.cancelAnimationFrame = jest.fn();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
    writable: true,
  });
  const context = {
    activeNode: { children: [] },
    canvasUtils: { clearAll: jest.fn() },
    destroyed: false,
    paintLayer: jest.fn(),
    pendingNavigationQueue: [],
    pendingNavigationScheduled: false,
    resizePending: false,
    viewport: { x0: 0, x1: 100, y0: 0, y1: 100 },
    viewportTransitionInProgress: false,
  };
  const target = { x0: 20, x1: 80, y0: 10, y1: 90 };

  try {
    const transition = transitionTo.call(context, target);
    expect(context.viewportTransitionInProgress).toBe(true);

    document.hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));

    await expect(transition).resolves.toBe(true);
    expect(context.viewport).toEqual(target);
    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(context.viewportTransitionInProgress).toBe(false);
  } finally {
    global.requestAnimationFrame = originalAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
    if (originalHidden) {
      Object.defineProperty(document, "hidden", originalHidden);
    } else {
      delete document.hidden;
    }
  }
});

test("honors a zoom-out requested during a zoom-in transition", async () => {
  const animationFrames = [];
  const originalAnimationFrame = global.requestAnimationFrame;
  const originalMatchMedia = window.matchMedia;
  global.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  window.matchMedia = () => ({ matches: true });

  const root = {
    children: [],
    x0: 0,
    x1: 100,
    y0: 0,
    y1: 100,
  };
  const target = {
    text: "target",
    children: [{}],
    x0: 20,
    x1: 80,
    y0: 20,
    y1: 80,
  };
  root.children.push(target);
  const context = {
    activeNode: root,
    rootNode: root,
    viewport: { x0: 0, x1: 100, y0: 0, y1: 100 },
    viewportHistory: [],
    viewportHistoryUndoStack: [],
    viewportTransitionInProgress: false,
    transitionTargetNode: null,
    pendingNavigationScheduled: false,
    pendingNavigationQueue: [],
    resizePending: false,
    destroyed: false,
    canvasUtils: { clearAll: jest.fn() },
    paintLayer: jest.fn(),
    repaint: jest.fn(),
    emitEvent: jest.fn(),
  };
  context.transitionTo = transitionTo.bind(context);
  context.emitZoomEvent = emitZoomEvent.bind(context);
  context.zoomIn = zoomIn.bind(context);
  context.zoomOut = zoomOut.bind(context);

  const zoomingIn = context.zoomIn(target);
  const queuedZoomOut = context.zoomOut();
  animationFrames.shift()();
  await zoomingIn;

  expect(context.activeNode).toBe(target);
  expect(() => JSON.stringify(root.children)).not.toThrow();
  expect(target).not.toHaveProperty("parent");

  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(context.activeNode).toBe(root);
  expect(animationFrames).toHaveLength(1);

  animationFrames.shift()();
  await queuedZoomOut;

  expect(context.activeNode).toBe(root);
  expect(context.viewportHistory).toHaveLength(0);
  expect(context.emitEvent).toHaveBeenNthCalledWith(
    1,
    "zoom",
    expect.objectContaining({
      node: target,
      direction: "in",
      depth: 1,
      canZoomOut: true,
    })
  );
  expect(context.emitEvent).toHaveBeenNthCalledWith(
    2,
    "zoom",
    expect.objectContaining({
      node: root,
      direction: "out",
      depth: 0,
      canZoomOut: false,
    })
  );
  global.requestAnimationFrame = originalAnimationFrame;
  window.matchMedia = originalMatchMedia;
});

test("preserves every zoom-out requested during a transition", async () => {
  const animationFrames = [];
  const originalAnimationFrame = global.requestAnimationFrame;
  const originalMatchMedia = window.matchMedia;
  global.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  window.matchMedia = () => ({ matches: true });

  const root = {
    children: [],
    x0: 0,
    x1: 100,
    y0: 0,
    y1: 100,
  };
  const levelOne = {
    text: "one",
    children: [],
    x0: 10,
    x1: 90,
    y0: 10,
    y1: 90,
  };
  const levelTwo = {
    text: "two",
    children: [],
    x0: 20,
    x1: 80,
    y0: 20,
    y1: 80,
  };
  const levelThree = {
    text: "three",
    children: [{}],
    x0: 30,
    x1: 70,
    y0: 30,
    y1: 70,
  };
  root.children.push(levelOne);
  levelOne.children.push(levelTwo);
  levelTwo.children.push(levelThree);

  const context = {
    activeNode: levelThree,
    rootNode: root,
    viewport: { x0: 30, x1: 70, y0: 30, y1: 70 },
    viewportHistory: [
      { node: levelOne, viewport: levelOne },
      { node: levelTwo, viewport: levelTwo },
      { node: levelThree, viewport: levelThree },
    ],
    viewportHistoryUndoStack: [],
    viewportTransitionInProgress: false,
    transitionTargetNode: null,
    pendingNavigationScheduled: false,
    pendingNavigationQueue: [],
    resizePending: false,
    destroyed: false,
    canvasUtils: { clearAll: jest.fn() },
    paintLayer: jest.fn(),
    repaint: jest.fn(),
    emitEvent: jest.fn(),
  };
  context.transitionTo = transitionTo.bind(context);
  context.emitZoomEvent = emitZoomEvent.bind(context);
  context.zoomOut = zoomOut.bind(context);

  const first = context.zoomOut();
  const second = context.zoomOut();
  const third = context.zoomOut();

  animationFrames.shift()();
  await first;
  await new Promise((resolve) => setTimeout(resolve, 0));
  animationFrames.shift()();
  await second;
  await new Promise((resolve) => setTimeout(resolve, 0));
  animationFrames.shift()();

  await expect(third).resolves.toBe(true);
  expect(context.activeNode).toBe(root);
  expect(context.viewportHistory).toHaveLength(0);
  expect(
    context.emitEvent.mock.calls.map(([, payload]) => payload.depth)
  ).toEqual([2, 1, 0]);

  global.requestAnimationFrame = originalAnimationFrame;
  window.matchMedia = originalMatchMedia;
});

test("preserves a redo that reverses an animated zoom-out", async () => {
  const animationFrames = [];
  const originalAnimationFrame = global.requestAnimationFrame;
  const originalMatchMedia = window.matchMedia;
  global.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  window.matchMedia = () => ({ matches: true });

  const root = {
    children: [],
    x0: 0,
    x1: 100,
    y0: 0,
    y1: 100,
  };
  const target = {
    text: "target",
    children: [{}],
    x0: 20,
    x1: 80,
    y0: 20,
    y1: 80,
  };
  root.children.push(target);
  const context = {
    activeNode: target,
    rootNode: root,
    viewport: { x0: 20, x1: 80, y0: 20, y1: 80 },
    viewportHistory: [{ node: target, viewport: target }],
    viewportHistoryUndoStack: [],
    viewportTransitionInProgress: false,
    transitionTargetNode: null,
    pendingNavigationScheduled: false,
    pendingNavigationQueue: [],
    resizePending: false,
    destroyed: false,
    canvasUtils: { clearAll: jest.fn() },
    paintLayer: jest.fn(),
    repaint: jest.fn(),
    emitEvent: jest.fn(),
  };
  context.transitionTo = transitionTo.bind(context);
  context.emitZoomEvent = emitZoomEvent.bind(context);
  context.zoomOut = zoomOut.bind(context);
  context.undoZoomOut = undoZoomOut.bind(context);

  const zoomingOut = context.zoomOut();
  const reversing = context.undoZoomOut();
  animationFrames.shift()();
  await zoomingOut;
  await new Promise((resolve) => setTimeout(resolve, 0));
  animationFrames.shift()();

  await expect(reversing).resolves.toBe(true);
  expect(context.activeNode).toBe(target);
  expect(context.viewportHistory).toHaveLength(1);
  expect(context.viewportHistoryUndoStack).toHaveLength(0);
  expect(
    context.emitEvent.mock.calls.map(([, payload]) => [
      payload.direction,
      payload.depth,
    ])
  ).toEqual([
    ["out", 0],
    ["redo", 1],
  ]);

  global.requestAnimationFrame = originalAnimationFrame;
  window.matchMedia = originalMatchMedia;
});
