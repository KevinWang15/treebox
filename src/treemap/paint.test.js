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
    { hovering: false, depth: 0 }
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
    { hovering: false, depth: 0 }
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
      fillRect.mock.calls.every((call) => call[4].color === fallbackGradient)
    ).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  } finally {
    warn.mockRestore();
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
