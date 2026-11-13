import { paintLayer, repaint } from "./paint";

function paintAtRatio(pixelRatio) {
  const fillText = jest.fn();
  const context = {
    activeNode: {},
    canvas2dContext: {},
    canvasUtils: {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      fillText,
    },
    pixelRatio,
    transitionTargetNode: null,
    viewportUtils: {
      transform: ({ x0, x1, y0, y1 }) => ({
        x0: x0 * pixelRatio,
        x1: x1 * pixelRatio,
        y0: y0 * pixelRatio,
        y1: y1 * pixelRatio,
      }),
    },
  };
  context.paintLayer = paintLayer.bind(context);
  context.paintLayer(
    [
      {
        text: "label",
        color: () => "red",
        children: null,
        x0: 0,
        x1: 100,
        y0: 0,
        y1: 60,
      },
    ],
    { hovering: false, depth: 0 },
  );
  return fillText.mock.calls[0][2];
}

test("keeps calculated label sizes constant in CSS pixels", () => {
  expect(paintAtRatio(1)).toBe(10);
  expect(paintAtRatio(2)).toBe(20);
});

test("uses a static canvas color without replacing it with a fallback", () => {
  const fillRect = jest.fn();
  const context = {
    activeNode: {},
    canvas2dContext: {},
    canvasUtils: {
      clearRect: jest.fn(),
      fillRect,
      fillText: jest.fn(),
    },
    pixelRatio: 1,
    transitionTargetNode: null,
    viewportUtils: {
      transform: (bounds) => bounds,
    },
  };
  context.paintLayer = paintLayer.bind(context);

  context.paintLayer(
    [
      {
        text: "static color",
        color: "#ff0000",
        children: null,
        x0: 0,
        x1: 100,
        y0: 0,
        y1: 60,
      },
    ],
    { hovering: false, depth: 0 },
  );

  expect(fillRect).toHaveBeenCalledWith(0, 0, 100, 60, {
    color: "#ff0000",
  });
});

test("falls back once when a color callback returns no color", () => {
  const fallbackGradient = { addColorStop: jest.fn() };
  const fillRect = jest.fn();
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const item = {
    text: "missing color",
    color: () => undefined,
    children: null,
    x0: 0,
    x1: 100,
    y0: 0,
    y1: 60,
  };
  const context = {
    activeNode: {},
    canvas2dContext: {
      createLinearGradient: jest.fn(() => fallbackGradient),
      restore: jest.fn(),
      save: jest.fn(),
    },
    canvasUtils: {
      clearRect: jest.fn(),
      fillRect,
      fillText: jest.fn(),
    },
    pixelRatio: 1,
    transitionTargetNode: null,
    viewportUtils: {
      transform: (bounds) => bounds,
    },
  };
  context.paintLayer = paintLayer.bind(context);

  try {
    context.paintLayer([item], { hovering: false, depth: 0 });
    context.paintLayer([item], { hovering: true, depth: 0 });

    expect(fillRect).toHaveBeenCalledTimes(2);
    expect(
      fillRect.mock.calls.every((call) => call[4].color === fallbackGradient),
    ).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  } finally {
    warn.mockRestore();
  }
});

test("falls back when Canvas rejects a configured color", () => {
  const fallbackGradient = { addColorStop: jest.fn() };
  const fillRect = jest.fn();
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  let fillStyle = "#000000";
  const canvas2dContext = {
    createLinearGradient: jest.fn(() => fallbackGradient),
  };
  Object.defineProperty(canvas2dContext, "fillStyle", {
    configurable: true,
    get: () => fillStyle,
    set: (color) => {
      if (["#000000", "#ffffff"].includes(color)) {
        fillStyle = color;
      }
    },
  });
  const context = {
    activeNode: {},
    canvas2dContext,
    canvasUtils: {
      clearRect: jest.fn(),
      fillRect,
      fillText: jest.fn(),
    },
    pixelRatio: 1,
    transitionTargetNode: null,
    viewportUtils: {
      transform: (bounds) => bounds,
    },
  };
  context.paintLayer = paintLayer.bind(context);

  try {
    context.paintLayer(
      [
        {
          text: "invalid color",
          color: "not-a-color",
          children: null,
          x0: 0,
          x1: 100,
          y0: 0,
          y1: 60,
        },
      ],
      { hovering: false, depth: 0 },
    );

    expect(fillRect).toHaveBeenCalledWith(0, 0, 100, 60, {
      color: fallbackGradient,
    });
    expect(warn).toHaveBeenCalledTimes(1);
  } finally {
    warn.mockRestore();
  }
});

test("accepts native canvas paints without reparsing them", () => {
  const OriginalCanvasGradient = global.CanvasGradient;
  class FakeCanvasGradient {}
  global.CanvasGradient = FakeCanvasGradient;
  const gradient = new FakeCanvasGradient();
  const fillRect = jest.fn();
  let fillStyleAssignments = 0;
  const canvas2dContext = {};
  Object.defineProperty(canvas2dContext, "fillStyle", {
    configurable: true,
    get: () => "#000000",
    set: () => {
      fillStyleAssignments++;
    },
  });
  const context = {
    activeNode: {},
    canvas2dContext,
    canvasUtils: {
      clearRect: jest.fn(),
      fillRect,
      fillText: jest.fn(),
    },
    pixelRatio: 1,
    transitionTargetNode: null,
    viewportUtils: {
      transform: (bounds) => bounds,
    },
  };
  context.paintLayer = paintLayer.bind(context);

  try {
    context.paintLayer(
      [
        {
          text: "gradient",
          color: () => gradient,
          children: null,
          x0: 0,
          x1: 100,
          y0: 0,
          y1: 60,
        },
      ],
      { hovering: false, depth: 0 },
    );

    expect(fillRect).toHaveBeenCalledWith(0, 0, 100, 60, { color: gradient });
    expect(fillStyleAssignments).toBe(0);
  } finally {
    if (OriginalCanvasGradient === undefined) {
      delete global.CanvasGradient;
    } else {
      global.CanvasGradient = OriginalCanvasGradient;
    }
  }
});

test("restores the current hover layer after a full repaint", () => {
  const activeNode = { text: "root" };
  const lastHoveringItem = { text: "hovered" };
  const clearRectAndPaintLayer = jest.fn();
  const context = {
    activeNode,
    canvasElement: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 100,
        height: 50,
      }),
      style: {},
    },
    clearRectAndPaintLayer,
    destroyed: false,
    domElement: { clientWidth: 100, clientHeight: 50 },
    lastHoveringItem,
    pixelRatio: 2,
    rootNode: { x1: 100, y1: 50 },
    viewportTransitionInProgress: false,
  };

  repaint.call(context, { skipResize: true });

  expect(clearRectAndPaintLayer.mock.calls).toEqual([
    [activeNode, { hovering: false, depth: -1 }],
    [lastHoveringItem, { hovering: true, depth: 0 }],
  ]);
});

test("skips all paint work for nodes outside the canvas", () => {
  const color = jest.fn(() => "red");
  const context = {
    activeNode: {},
    canvas2dContext: {},
    canvasElement: { width: 100, height: 100 },
    canvasUtils: {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
    },
    pixelRatio: 1,
    transitionTargetNode: null,
    viewportUtils: { transform: (bounds) => bounds },
  };
  context.paintLayer = paintLayer.bind(context);

  context.paintLayer(
    [
      {
        text: "offscreen",
        color,
        children: [{ text: "child", children: null }],
        x0: 101,
        x1: 201,
        y0: 0,
        y1: 100,
      },
    ],
    { hovering: false, depth: 0 },
  );

  expect(color).not.toHaveBeenCalled();
  expect(context.canvasUtils.clearRect).not.toHaveBeenCalled();
  expect(context.canvasUtils.fillRect).not.toHaveBeenCalled();
  expect(context.canvasUtils.fillText).not.toHaveBeenCalled();
});

test("does not reset an unchanged canvas backing store during repaint", () => {
  let width = 200;
  let height = 100;
  const setWidth = jest.fn((value) => {
    width = value;
  });
  const setHeight = jest.fn((value) => {
    height = value;
  });
  const canvasElement = {
    get width() {
      return width;
    },
    set width(value) {
      setWidth(value);
    },
    get height() {
      return height;
    },
    set height(value) {
      setHeight(value);
    },
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 50,
    }),
    style: { width: "100px", height: "50px" },
  };
  const context = {
    activeNode: {},
    canvasElement,
    clearRectAndPaintLayer: jest.fn(),
    destroyed: false,
    domElement: { clientWidth: 100, clientHeight: 50 },
    lastHoveringItem: null,
    pixelRatio: 2,
    rootNode: { x1: 100, y1: 50 },
  };

  repaint.call(context, { skipResize: true });

  expect(setWidth).not.toHaveBeenCalled();
  expect(setHeight).not.toHaveBeenCalled();
});

function partsPainter({ transitionReveals = null } = {}) {
  const fillRect = jest.fn();
  // Like Canvas, keeps the previous fill style when given something that isn't a color.
  let fillStyle = "#000000";
  const canvas2dContext = { save: jest.fn(), restore: jest.fn() };
  Object.defineProperty(canvas2dContext, "fillStyle", {
    get: () => fillStyle,
    set: (color) => {
      if (typeof color === "string" && color.startsWith("#")) {
        fillStyle = color;
      }
    },
  });
  const context = {
    activeNode: {},
    canvas2dContext,
    canvasUtils: { clearRect: jest.fn(), fillRect, fillText: jest.fn() },
    pixelRatio: 1,
    transitionReveals,
    viewportUtils: { transform: (bounds) => bounds },
  };
  context.paintLayer = paintLayer.bind(context);
  return { context, fillRect };
}

const box = (fields) => ({
  x0: 0,
  x1: 100,
  y0: 0,
  y1: 60,
  children: null,
  ...fields,
});

test("paints a front block's parts, and its children in their colors", () => {
  const { context, fillRect } = partsPainter();
  const child = box({
    text: "child",
    color: "#00ff00",
    parts: [{ weight: 1, color: "#0000ff" }],
  });
  const parent = box({
    text: "parent",
    color: "#ff0000",
    parts: [
      { weight: 1, color: "#111111" },
      { weight: 0, color: "#222222" },
      { weight: 3, color: () => "#333333" },
    ],
    children: [child],
  });

  context.paintLayer([parent], { hovering: false, depth: 0 });

  expect(fillRect.mock.calls.map((call) => call[4])).toEqual([
    { color: "#00ff00" },
    {
      parts: [
        { weight: 1, color: "#111111" },
        { weight: 3, color: "#333333" },
      ],
    },
  ]);
});

test("paints the parts of the children a transition reveals", () => {
  const child = box({
    text: "child",
    color: "#00ff00",
    parts: [{ weight: 1, color: "#0000ff" }],
  });
  const parent = box({ text: "parent", color: "#ff0000", children: [child] });
  const { context, fillRect } = partsPainter({
    transitionReveals: new Set([parent]),
  });

  context.paintLayer([parent], {
    hovering: false,
    depth: 0,
    transitionProgress: 0.5,
  });

  expect(fillRect.mock.calls[0][4]).toEqual({
    parts: [{ weight: 1, color: "#0000ff" }],
  });
});

test("paints a block in its color when its parts can't be painted", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const { context, fillRect } = partsPainter();
  const items = [
    box({
      text: "invalid",
      color: "#ff0000",
      parts: [{ weight: -1, color: "#0000ff" }],
    }),
    box({
      text: "empty",
      color: "#ff0000",
      parts: [{ weight: 0, color: "#0000ff" }],
    }),
    box({
      text: "bad color",
      color: "#ff0000",
      parts: [{ weight: 1, color: 42 }],
    }),
  ];

  context.paintLayer(items, { hovering: false, depth: 0 });

  expect(fillRect.mock.calls.map((call) => call[4])).toEqual([
    { color: "#ff0000" },
    { color: "#ff0000" },
    { parts: [{ weight: 1, color: "#ff0000" }] },
  ]);
  expect(warn).toHaveBeenCalledTimes(2);
  warn.mockRestore();
});
