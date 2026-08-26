import { emitZoomEvent, transitionTo, zoomIn, zoomOut } from "./transition";

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
    pendingZoomOut: false,
    pendingZoomOutScheduled: false,
    pendingZoomOutResolvers: [],
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
