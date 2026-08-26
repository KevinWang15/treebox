import { fillText } from "./canvas";

test("wraps an unbroken label within the available bounds", () => {
  const canvas2dContext = {
    beginPath: jest.fn(),
    clip: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn((text) => ({ width: text.length * 10 })),
    rect: jest.fn(),
    restore: jest.fn(),
    save: jest.fn(),
  };
  const context = {
    BOX_MARGIN: 1,
    canvas2dContext,
  };

  fillText.call(
    context,
    "abcdefghijklmnopqrstuv",
    { x0: 0, x1: 100, y0: 0, y1: 100 },
    20
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
  };

  fillText.call(
    { BOX_MARGIN: 1, canvas2dContext },
    "abcdefghijklmnopqrstuv",
    { x0: 0, x1: 100, y0: 0, y1: 40 },
    20
  );

  expect(canvas2dContext.fillText).toHaveBeenCalledTimes(1);
  expect(canvas2dContext.fillText).toHaveBeenCalledWith(
    "abcdefgh…",
    50,
    20,
    98
  );
});
