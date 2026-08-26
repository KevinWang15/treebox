import {
  emitZoomEvent,
  transitionTo,
  undoZoomOut,
  zoomIn,
  zoomOut,
} from "./transition";

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
