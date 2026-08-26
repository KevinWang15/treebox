import { reverseViewportTransform } from "./viewport";

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
