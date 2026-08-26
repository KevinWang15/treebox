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

test("rejects cyclic data before adding canvas elements", () => {
  const item = { text: "cycle" };
  item.children = [item];
  const host = document.createElement("div");
  document.body.appendChild(host);
  const bodyChildCount = document.body.childElementCount;

  expect(() => new TreeBox({ data: [item], domElement: host })).toThrow(
    "Treemap data must not contain cycles"
  );
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
        })
    ).toThrow("observer setup failed");
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(host.querySelector("canvas")).toBeNull();
    expect(document.body.childElementCount).toBe(bodyChildCount);
  } finally {
    global.ResizeObserver = OriginalResizeObserver;
    host.remove();
  }
});
