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
    BOX_MARGIN: 1,
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
    { BOX_MARGIN: 1, canvas2dContext, pixelRatio: 1 },
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
    { BOX_MARGIN: 1, canvas2dContext, pixelRatio: 1 },
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
    BOX_MARGIN: 1,
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
    { BOX_MARGIN: 1, canvas2dContext, pixelRatio: 2 },
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
    BOX_MARGIN: 1,
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
