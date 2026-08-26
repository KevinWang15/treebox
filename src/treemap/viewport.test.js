import {
  isUsableViewport,
  reverseViewportTransform,
  viewportTransform,
} from "./viewport";

test("requires finite, non-zero viewport spans", () => {
  expect(isUsableViewport({ x0: 0, x1: 1, y0: 0, y1: 1 })).toBe(true);
  expect(isUsableViewport(null)).toBe(false);
  expect(isUsableViewport({ x0: 1, x1: 1, y0: 0, y1: 1 })).toBe(false);
  expect(isUsableViewport({ x0: 0, x1: 1, y0: 2, y1: 1 })).toBe(false);
  expect(isUsableViewport({ x0: 0, x1: Infinity, y0: 0, y1: 1 })).toBe(false);
});

test("forward transforms coordinates into the canvas backing store", () => {
  const context = {
    viewport: { x0: 10, x1: 110, y0: 20, y1: 220 },
    canvasElement: {
      width: 600,
      height: 300,
      clientWidth: 300,
      clientHeight: 150,
    },
  };

  expect(
    viewportTransform.call(context, { x0: 10, x1: 60, y0: 20, y1: 120 })
  ).toEqual({ x0: 0, x1: 300, y0: 0, y1: 150 });
});

test("reverse transforms coordinates against the rendered canvas size", () => {
  const context = {
    viewport: { x0: 10, x1: 110, y0: 20, y1: 220 },
    domElementRect: { width: 180, height: 90 },
    canvasElement: { clientWidth: 600, clientHeight: 300 },
    pixelRatio: 2,
  };

  expect(
    reverseViewportTransform.call(context, {
      x0: 90,
      x1: 180,
      y0: 45,
      y1: 90,
    })
  ).toEqual({
    x0: 60,
    x1: 110,
    y0: 120,
    y1: 220,
  });
});
