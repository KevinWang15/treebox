import { paintLayer } from "./paint";

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
