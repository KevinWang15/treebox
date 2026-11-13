import { DEFAULT_STYLE } from "./style";
import { fillRect, fillText } from "./canvas";

test("wraps an unbroken label within the available bounds", () => {
  const canvas2dContext = {
    beginPath: jest.fn(),
    clip: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn((text) => ({ width: text.length * 10 })),
    rect: jest.fn(),
    restore: jest.fn(),
    save: jest.fn(),
    strokeText: jest.fn(),
  };
  const context = {
    style: DEFAULT_STYLE,
    canvas2dContext,
    pixelRatio: 1,
  };

  fillText.call(
    context,
    "abcdefghijklmnopqrstuv",
    { x0: 0, x1: 100, y0: 0, y1: 100 },
    20,
  );

  expect(canvas2dContext.fillText.mock.calls).toEqual([
    ["abcdefghi", 50, 26, 98],
    ["jklmnopqr", 50, 50, 98],
    ["stuv", 50, 74, 98],
  ]);
});

test("ellipsizes wrapped text that exceeds the available height", () => {
  const canvas2dContext = {
    beginPath: jest.fn(),
    clip: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn((text) => ({ width: text.length * 10 })),
    rect: jest.fn(),
    restore: jest.fn(),
    save: jest.fn(),
    strokeText: jest.fn(),
  };

  fillText.call(
    { style: DEFAULT_STYLE, canvas2dContext, pixelRatio: 1 },
    "abcdefghijklmnopqrstuv",
    { x0: 0, x1: 100, y0: 0, y1: 40 },
    20,
  );

  expect(canvas2dContext.fillText).toHaveBeenCalledTimes(1);
  expect(canvas2dContext.fillText).toHaveBeenCalledWith(
    "abcdefgh…",
    50,
    20,
    98,
  );
});

test("preserves explicit line breaks", () => {
  const canvas2dContext = {
    beginPath: jest.fn(),
    clip: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn((text) => ({ width: text.length * 10 })),
    rect: jest.fn(),
    restore: jest.fn(),
    save: jest.fn(),
    strokeText: jest.fn(),
  };

  fillText.call(
    { style: DEFAULT_STYLE, canvas2dContext, pixelRatio: 1 },
    "Revenue\r\nFY 2026",
    { x0: 0, x1: 100, y0: 0, y1: 100 },
    20,
  );

  expect(canvas2dContext.fillText.mock.calls).toEqual([
    ["Revenue", 50, 38, 98],
    ["FY 2026", 50, 62, 98],
  ]);
});

test("keeps box and text margins constant at high pixel ratios", () => {
  const canvas2dContext = {
    beginPath: jest.fn(),
    clip: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 20 })),
    rect: jest.fn(),
    restore: jest.fn(),
    save: jest.fn(),
    strokeText: jest.fn(),
  };
  const context = {
    style: DEFAULT_STYLE,
    canvas2dContext,
    canvasElement: { width: 200, height: 200 },
    pixelRatio: 2,
    viewport: { x0: 0, x1: 100, y0: 0, y1: 100 },
  };

  fillRect.call(context, 0, 0, 100, 100, { color: "red" });
  fillText.call(context, "label", { x0: 0, x1: 200, y0: 0, y1: 200 }, 20);

  expect(canvas2dContext.fillRect).toHaveBeenCalledWith(2, 2, 196, 196);
  expect(canvas2dContext.rect).toHaveBeenCalledWith(2, 2, 196, 196);
  expect(canvas2dContext.fillText).toHaveBeenCalledWith("label", 100, 100, 196);
  expect(canvas2dContext.strokeText).toHaveBeenCalledWith(
    "label",
    100,
    100,
    196,
  );
  expect(canvas2dContext.lineWidth).toBe(2);
  expect(canvas2dContext.strokeStyle).toBe("rgba(9, 14, 25, 0.84)");
  expect(canvas2dContext.strokeText.mock.invocationCallOrder[0]).toBeLessThan(
    canvas2dContext.fillText.mock.invocationCallOrder[0],
  );
});

test("uses a CSS-pixel minimum for high-resolution text", () => {
  const canvas2dContext = {
    beginPath: jest.fn(),
    clip: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(),
    rect: jest.fn(),
    restore: jest.fn(),
    save: jest.fn(),
    strokeText: jest.fn(),
  };

  fillText.call(
    { style: DEFAULT_STYLE, canvas2dContext, pixelRatio: 2 },
    "too small",
    { x0: 0, x1: 100, y0: 0, y1: 100 },
    10,
  );

  expect(canvas2dContext.save).not.toHaveBeenCalled();
  expect(canvas2dContext.fillText).not.toHaveBeenCalled();
});

test("reuses measured label layouts until their geometry changes", () => {
  const canvas2dContext = {
    beginPath: jest.fn(),
    clip: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn((text) => ({ width: text.length * 10 })),
    rect: jest.fn(),
    restore: jest.fn(),
    save: jest.fn(),
    strokeText: jest.fn(),
  };
  const context = {
    style: DEFAULT_STYLE,
    canvas2dContext,
    pixelRatio: 1,
  };
  const item = {};
  const bounds = { x0: 0, x1: 100, y0: 0, y1: 100 };

  fillText.call(context, "a measured label", bounds, 20, "white", item);
  const firstMeasurementCount = canvas2dContext.measureText.mock.calls.length;
  fillText.call(context, "a measured label", bounds, 20, "white", item);

  expect(firstMeasurementCount).toBeGreaterThan(0);
  expect(canvas2dContext.measureText).toHaveBeenCalledTimes(
    firstMeasurementCount,
  );

  fillText.call(context, "a changed label", bounds, 20, "white", item);
  expect(canvas2dContext.measureText.mock.calls.length).toBeGreaterThan(
    firstMeasurementCount,
  );
});

function partsContext(style = DEFAULT_STYLE) {
  const fills = [];
  const canvas2dContext = {
    beginPath: jest.fn(),
    clip: jest.fn(),
    restore: jest.fn(),
    roundRect: jest.fn(),
    save: jest.fn(),
    fill: jest.fn(),
    fillRect: jest.fn((...rect) =>
      fills.push([canvas2dContext.fillStyle, ...rect]),
    ),
  };
  const context = {
    style,
    canvas2dContext,
    canvasElement: { width: 100, height: 100 },
    pixelRatio: 1,
    viewport: { x0: 0, x1: 100, y0: 0, y1: 100 },
  };
  return { context, canvas2dContext, fills };
}

test("paints parts side by side along a wide block, on whole pixels", () => {
  const { context, fills } = partsContext();
  const parts = [
    { weight: 1, color: "red" },
    { weight: 2, color: "blue" },
  ];

  fillRect.call(context, 0, 0, 100, 50, { parts });

  // The block is inset by half the gap: 1, 1, 98 × 48. The edge is at 1 + 98 / 3 = 33.67, rounded to 34.
  expect(fills).toEqual([
    ["red", 1, 1, 33, 48],
    ["blue", 34, 1, 65, 48],
  ]);
});

test("paints parts top to bottom along a tall block", () => {
  const { context, fills } = partsContext();
  const parts = [
    { weight: 3, color: "red" },
    { weight: 1, color: "blue" },
  ];

  fillRect.call(context, 0, 0, 40, 100, { parts });

  expect(fills).toEqual([
    ["red", 1, 1, 38, 74],
    ["blue", 1, 75, 38, 24],
  ]);
});

test("clips parts to a rounded block", () => {
  const { context, canvas2dContext, fills } = partsContext({
    ...DEFAULT_STYLE,
    cornerRadius: 6,
  });

  fillRect.call(context, 0, 0, 100, 50, {
    parts: [
      { weight: 1, color: "red" },
      { weight: 1, color: "blue" },
    ],
  });

  expect(canvas2dContext.roundRect).toHaveBeenCalledWith(1, 1, 98, 48, 6);
  expect(canvas2dContext.clip).toHaveBeenCalled();
  expect(canvas2dContext.fill).not.toHaveBeenCalled();
  expect(fills.map(([color]) => color)).toEqual(["red", "blue"]);
  expect(canvas2dContext.restore).toHaveBeenCalled();
});
