import TreeBox from "./TreeBox";

const gradient = { addColorStop() {} };
const canvasContext = {
  beginPath() {},
  clearRect() {},
  clip() {},
  createLinearGradient() {
    return gradient;
  },
  fillRect() {},
  fillText() {},
  measureText() {
    return { width: 10 };
  },
  rect() {},
  restore() {},
  save() {},
  strokeText() {},
};

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => canvasContext,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return this.width;
    },
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return this.height;
    },
  });
});

test("reflows item layout when repaint sees a new container aspect ratio", () => {
  let width = 600;
  let height = 300;
  const host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { configurable: true, get: () => width },
    clientHeight: { configurable: true, get: () => height },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({ left: 0, top: 0, width, height }),
    },
  });
  document.body.appendChild(host);
  const data = [
    { text: "one", weight: 1, children: null },
    { text: "two", weight: 1, children: null },
  ];
  const treebox = new TreeBox({ data, domElement: host });

  expect(data.every((item) => item.y0 === 0 && item.y1 === 300)).toBe(true);

  width = 300;
  height = 600;
  treebox.repaint();

  expect(treebox.rootNode).toMatchObject({ x1: 300, y1: 600 });
  expect(treebox.viewport).toEqual({ x0: 0, x1: 300, y0: 0, y1: 600 });
  expect(data.every((item) => item.x0 === 0 && item.x1 === 300)).toBe(true);

  treebox.destroy();
  host.remove();
});

test("cancels an active selection when the container size changes", () => {
  let width = 600;
  let height = 300;
  const host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { configurable: true, get: () => width },
    clientHeight: { configurable: true, get: () => height },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({ left: 0, top: 0, width, height }),
    },
  });
  document.body.appendChild(host);
  const group = {
    text: "group",
    children: [{ text: "leaf", weight: 1, children: null }],
  };
  const treebox = new TreeBox({ data: [group], domElement: host });
  treebox.isMouseDown = true;
  treebox.activePointerId = 7;
  treebox.lastMouseDownPos = { x: 100, y: 100 };
  treebox.selectionAreaViewPort = { x0: 100, x1: 300, y0: 100, y1: 200 };
  treebox.selectionAreaWasTriggered = true;
  treebox.selectionAreaElement.style.display = "block";

  width = 300;
  height = 600;
  treebox.repaint();

  expect(treebox.isMouseDown).toBe(false);
  expect(treebox.activePointerId).toBeUndefined();
  expect(treebox.lastMouseDownPos).toBeNull();
  expect(treebox.selectionAreaViewPort).toBeNull();
  expect(treebox.selectionAreaElement.style.display).toBe("none");
  expect(treebox.selectionAreaWasTriggered).toBe(true);

  treebox.onClickEventListener({ detail: 1, clientX: 150, clientY: 300 });
  expect(treebox.selectionAreaWasTriggered).toBe(false);
  expect(treebox.viewportHistory).toHaveLength(0);

  treebox.destroy();
  host.remove();
});

test("keeps the viewport coordinate-only while resizing a node view", () => {
  let width = 600;
  let height = 300;
  const host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { configurable: true, get: () => width },
    clientHeight: { configurable: true, get: () => height },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({ left: 0, top: 0, width, height }),
    },
  });
  document.body.appendChild(host);
  const data = [
    {
      text: "group",
      children: [
        { text: "one", weight: 1, children: null },
        { text: "two", weight: 1, children: null },
      ],
    },
    { text: "other", weight: 2, children: null },
  ];
  const treebox = new TreeBox({ data, domElement: host });
  treebox.activeNode = data[0];
  treebox.viewportHistory.push({ node: data[0], viewport: data[0] });
  Object.assign(treebox.viewport, {
    x0: data[0].x0,
    x1: data[0].x1,
    y0: data[0].y0,
    y1: data[0].y1,
  });

  width = 300;
  height = 600;
  treebox.repaint();

  expect(Object.keys(treebox.viewport).sort()).toEqual([
    "x0",
    "x1",
    "y0",
    "y1",
  ]);
  expect(treebox.viewport).toEqual({
    x0: data[0].x0,
    x1: data[0].x1,
    y0: data[0].y0,
    y1: data[0].y1,
  });

  treebox.destroy();
  host.remove();
});

test("defers painting a zero-size chart until its container becomes visible", () => {
  let width = 0;
  let height = 0;
  const host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { configurable: true, get: () => width },
    clientHeight: { configurable: true, get: () => height },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({ left: 0, top: 0, width, height }),
    },
  });
  document.body.appendChild(host);
  const color = jest.fn(() => "red");
  const treebox = new TreeBox({
    data: [{ text: "hidden", weight: 1, children: null, color }],
    domElement: host,
    pixelRatio: 2,
  });

  expect(color).not.toHaveBeenCalled();
  expect(treebox.canvasElement).toMatchObject({ width: 0, height: 0 });

  width = 301;
  height = 201;
  treebox.repaint();

  expect(color).toHaveBeenCalled();
  expect(treebox.rootNode).toMatchObject({ x1: 301, y1: 201 });
  expect(treebox.canvasElement).toMatchObject({ width: 602, height: 402 });

  treebox.destroy();
  host.remove();
});

test("updates the canvas backing store when the display pixel ratio changes", () => {
  const width = 320;
  const height = 180;
  const host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { configurable: true, value: width },
    clientHeight: { configurable: true, value: height },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({ left: 0, top: 0, width, height }),
    },
  });
  document.body.appendChild(host);
  const treebox = new TreeBox({
    data: [{ text: "item", weight: 1, children: null }],
    domElement: host,
  });

  expect(treebox.setPixelRatio(2)).toBe(true);
  expect(treebox.pixelRatio).toBe(2);
  expect(treebox.canvasElement.style.zoom).toBeFalsy();
  expect(treebox.canvasElement.style.width).toBe("320px");
  expect(treebox.canvasElement.style.height).toBe("180px");
  expect(treebox.canvasElement).toMatchObject({ width: 640, height: 360 });
  expect(treebox.rootNode).toMatchObject({ x1: width, y1: height });
  expect(treebox.setPixelRatio(2)).toBe(false);

  treebox.destroy();
  expect(treebox.setPixelRatio(1)).toBe(false);
  host.remove();
});

test("converts pointer coordinates from the rendered canvas bounds", () => {
  const host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { configurable: true, value: 320 },
    clientHeight: { configurable: true, value: 180 },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({ left: 10, top: 20, width: 320, height: 180 }),
    },
  });
  document.body.appendChild(host);
  const treebox = new TreeBox({ data: [], domElement: host });
  treebox.canvasElement.getBoundingClientRect = () => ({
    left: 40,
    top: 60,
    width: 160,
    height: 90,
  });

  expect(treebox.eventToCanvasPoint({ clientX: 120, clientY: 90 })).toEqual({
    x: 80,
    y: 30,
  });

  treebox.destroy();
  host.remove();
});

test("reads rendered canvas bounds at most once per animation frame", () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  let expireRect;
  global.requestAnimationFrame = jest.fn((callback) => {
    expireRect = callback;
    return 42;
  });
  global.cancelAnimationFrame = jest.fn();
  const host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { configurable: true, value: 320 },
    clientHeight: { configurable: true, value: 180 },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 320, height: 180 }),
    },
  });
  document.body.appendChild(host);
  const treebox = new TreeBox({ data: [], domElement: host });
  const getBoundingClientRect = jest.fn(() => ({
    left: 40,
    top: 60,
    width: 160,
    height: 90,
  }));
  treebox.canvasElement.getBoundingClientRect = getBoundingClientRect;

  try {
    treebox.eventToCanvasPoint({ clientX: 120, clientY: 90 });
    treebox.eventToCanvasPoint({ clientX: 130, clientY: 100 });

    expect(getBoundingClientRect).toHaveBeenCalledTimes(1);
    expireRect();
    treebox.eventToCanvasPoint({ clientX: 140, clientY: 110 });
    expect(getBoundingClientRect).toHaveBeenCalledTimes(2);
  } finally {
    treebox.destroy();
    host.remove();
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  }
});

test("makes navigation methods safe after destroy", async () => {
  const host = document.createElement("div");
  Object.defineProperties(host, {
    clientWidth: { configurable: true, value: 320 },
    clientHeight: { configurable: true, value: 180 },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 320, height: 180 }),
    },
  });
  document.body.appendChild(host);
  const target = {
    text: "group",
    children: [{ text: "leaf", weight: 1, children: null }],
  };
  const treebox = new TreeBox({ data: [target], domElement: host });
  treebox.destroy();

  await expect(treebox.zoomIn(target)).resolves.toBe(false);
  await expect(treebox.zoomOut()).resolves.toBe(false);
  await expect(treebox.undoZoomOut()).resolves.toBe(false);
  await expect(treebox.transitionTo(target)).resolves.toBe(false);

  host.remove();
});

test.each([
  ["an invalid item", [null], "Treemap items must be objects"],
  [
    "a non-array child layer",
    [{ text: "invalid", children: {} }],
    "Treemap layer data must be an array",
  ],
])("rejects %s before adding canvas elements", (_name, data, message) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const bodyChildCount = document.body.childElementCount;

  expect(() => new TreeBox({ data, domElement: host })).toThrow(message);
  expect(host.querySelector("canvas")).toBeNull();
  expect(document.body.childElementCount).toBe(bodyChildCount);

  host.remove();
});

test("rejects a non-function event handler before adding canvas elements", () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const bodyChildCount = document.body.childElementCount;

  expect(
    () =>
      new TreeBox({
        data: [],
        domElement: host,
        eventHandler: "not callable",
      }),
  ).toThrow("TreeBox eventHandler must be a function");
  expect(host.querySelector("canvas")).toBeNull();
  expect(document.body.childElementCount).toBe(bodyChildCount);

  host.remove();
});

test("rejects cyclic data before adding canvas elements", () => {
  const item = { text: "cycle" };
  item.children = [item];
  const host = document.createElement("div");
  document.body.appendChild(host);
  const bodyChildCount = document.body.childElementCount;

  expect(() => new TreeBox({ data: [item], domElement: host })).toThrow(
    "Treemap data must not contain cycles",
  );
  expect(host.querySelector("canvas")).toBeNull();
  expect(document.body.childElementCount).toBe(bodyChildCount);

  host.remove();
});

test("rejects reused item objects before adding canvas elements", () => {
  const shared = { text: "shared", weight: 1, children: null };
  const host = document.createElement("div");
  document.body.appendChild(host);
  const bodyChildCount = document.body.childElementCount;

  expect(
    () => new TreeBox({ data: [shared, shared], domElement: host }),
  ).toThrow("Treemap data must not reuse item objects");
  expect(host.querySelector("canvas")).toBeNull();
  expect(document.body.childElementCount).toBe(bodyChildCount);

  host.remove();
});

test("cleans up DOM elements when layout fails after construction starts", () => {
  const item = Object.freeze({
    text: "frozen",
    weight: 1,
    children: null,
  });
  const host = document.createElement("div");
  document.body.appendChild(host);
  const bodyChildCount = document.body.childElementCount;

  expect(() => new TreeBox({ data: [item], domElement: host })).toThrow();
  expect(host.querySelector("canvas")).toBeNull();
  expect(document.body.childElementCount).toBe(bodyChildCount);

  host.remove();
});

test("cleans up when resize observation fails after listeners are added", () => {
  const OriginalResizeObserver = global.ResizeObserver;
  const disconnect = jest.fn();
  global.ResizeObserver = class {
    observe() {
      throw new Error("observer setup failed");
    }

    disconnect() {
      disconnect();
    }
  };
  const host = document.createElement("div");
  document.body.appendChild(host);
  const bodyChildCount = document.body.childElementCount;

  try {
    expect(
      () =>
        new TreeBox({
          data: [{ text: "valid", weight: 1, children: null }],
          domElement: host,
        }),
    ).toThrow("observer setup failed");
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(host.querySelector("canvas")).toBeNull();
    expect(document.body.childElementCount).toBe(bodyChildCount);
  } finally {
    global.ResizeObserver = OriginalResizeObserver;
    host.remove();
  }
});

describe("zoomTo", () => {
  let host;
  let originalMatchMedia;
  let originalAnimationFrame;

  beforeEach(() => {
    host = document.createElement("div");
    Object.defineProperties(host, {
      clientWidth: { configurable: true, value: 400 },
      clientHeight: { configurable: true, value: 200 },
      getBoundingClientRect: {
        configurable: true,
        value: () => ({ left: 0, top: 0, width: 400, height: 200 }),
      },
    });
    document.body.appendChild(host);
    // Reduced motion finishes each transition on its first frame.
    originalMatchMedia = window.matchMedia;
    window.matchMedia = () => ({ matches: true });
    originalAnimationFrame = global.requestAnimationFrame;
    global.requestAnimationFrame = (callback) => setTimeout(callback);
  });

  afterEach(() => {
    host.remove();
    window.matchMedia = originalMatchMedia;
    global.requestAnimationFrame = originalAnimationFrame;
  });

  const tree = () => {
    const leafA = { text: "a1", weight: 1, children: null };
    const inner = { text: "a2", children: [{ text: "x", weight: 1 }] };
    const groupA = { text: "a", children: [leafA, inner] };
    const groupB = { text: "b", children: [{ text: "b1", weight: 2 }] };
    return { data: [groupA, groupB], groupA, groupB, inner, leafA };
  };

  test("zooms several levels at once and back to the top", async () => {
    const { data, groupA, inner } = tree();
    const events = [];
    const treebox = new TreeBox({
      data,
      domElement: host,
      eventHandler: (type, payload) => type === "zoom" && events.push(payload),
    });

    await expect(treebox.zoomTo(inner)).resolves.toBe(true);
    expect(treebox.activeNode).toBe(inner);
    expect(treebox.viewport).toEqual({
      x0: inner.x0,
      x1: inner.x1,
      y0: inner.y0,
      y1: inner.y1,
    });
    expect(treebox.viewportHistory.map((entry) => entry.node)).toEqual([
      groupA,
      inner,
    ]);
    expect(treebox.transitionReveals).toBeNull();

    // Zooming out afterwards steps through the levels zoomTo passed.
    await treebox.zoomOut();
    expect(treebox.activeNode).toBe(groupA);

    await expect(treebox.zoomTo(null)).resolves.toBe(true);
    expect(treebox.activeNode).toBe(treebox.rootNode);
    expect(treebox.viewportHistory).toEqual([]);
    expect(events.map(({ direction, depth }) => [direction, depth])).toEqual([
      ["to", 2],
      ["out", 1],
      ["to", 0],
    ]);

    treebox.destroy();
  });

  test("reveals every level between the shared ancestor and the target", async () => {
    const { data, groupA, groupB, inner } = tree();
    const treebox = new TreeBox({ data, domElement: host });
    await treebox.zoomTo(groupB);

    const zooming = treebox.zoomTo(inner);
    expect(treebox.activeNode).toBe(treebox.rootNode);
    expect([...treebox.transitionReveals]).toEqual([groupA, inner]);
    await zooming;

    treebox.destroy();
  });

  test("replaces an area selection with the path to the target", async () => {
    const { data, groupA, groupB } = tree();
    const treebox = new TreeBox({ data, domElement: host });
    await treebox.zoomTo(groupA);
    treebox.viewportHistory.push({
      node: groupA,
      viewport: { x0: groupA.x0, x1: groupA.x0 + 10, y0: 0, y1: 10 },
    });

    // The item already zoomed into, but behind a selection, is still a move.
    await expect(treebox.zoomTo(groupA)).resolves.toBe(true);
    expect(treebox.viewportHistory).toEqual([
      { node: groupA, viewport: groupA },
    ]);
    expect(treebox.viewport.x1).toBe(groupA.x1);

    await treebox.zoomTo(groupB);
    expect(treebox.viewportUtils.transform(groupB)).toMatchObject({
      x0: 0,
      y0: 0,
    });
    treebox.destroy();
  });

  test("shows an item without children on its own, still hoverable", async () => {
    const { data, leafA } = tree();
    const treebox = new TreeBox({ data, domElement: host });

    await expect(treebox.zoomTo(leafA)).resolves.toBe(true);
    expect(treebox.activeNode).toBe(leafA);
    treebox.onMouseMove({ x: 200, y: 100 });
    expect(treebox.lastHoveringItem).toBe(leafA);

    treebox.destroy();
  });

  test("jumps without animating, and ignores items outside the tree", async () => {
    const { data, inner } = tree();
    const events = [];
    const treebox = new TreeBox({
      data,
      domElement: host,
      eventHandler: (type, payload) => type === "zoom" && events.push(payload),
    });

    const jump = treebox.zoomTo(inner, { animate: false });
    expect(treebox.activeNode).toBe(inner);
    expect(treebox.viewportTransitionInProgress).toBe(false);
    await expect(jump).resolves.toBe(true);
    await expect(treebox.zoomTo(inner)).resolves.toBe(true);
    expect(events).toHaveLength(1);

    await expect(treebox.zoomTo({ text: "stranger" })).resolves.toBe(false);
    expect(treebox.activeNode).toBe(inner);

    treebox.destroy();
    await expect(treebox.zoomTo(null)).resolves.toBe(false);
  });

  test("waits for a transition in progress, then runs in order", async () => {
    const { data, groupA, groupB } = tree();
    const events = [];
    const treebox = new TreeBox({
      data,
      domElement: host,
      eventHandler: (type, payload) =>
        type === "zoom" && events.push(payload.node.text),
    });

    const first = treebox.zoomIn(groupA);
    const second = treebox.zoomTo(groupB);
    await Promise.all([first, second]);

    expect(events).toEqual(["a", "b"]);
    expect(treebox.activeNode).toBe(groupB);
    treebox.destroy();
  });
});
