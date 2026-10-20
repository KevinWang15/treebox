import { fillRect, fillText } from "./canvas";
import { DEFAULT_STYLE, resolveStyle, resolveTextColor } from "./style";
import TreeBox from "./TreeBox";

function createCanvasContext() {
  return {
    beginPath: jest.fn(),
    clip: jest.fn(),
    fill: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn((text) => ({ width: text.length * 5 })),
    rect: jest.fn(),
    restore: jest.fn(),
    roundRect: jest.fn(),
    save: jest.fn(),
    strokeText: jest.fn(),
  };
}

function createPainter(style, pixelRatio = 1) {
  // fillRect maps layout coordinates through the viewport onto the canvas; an
  // identity viewport over a 100 CSS-px canvas keeps the arithmetic readable.
  return {
    canvas2dContext: createCanvasContext(),
    canvasElement: { width: 100 * pixelRatio, height: 100 * pixelRatio },
    pixelRatio,
    style: resolveStyle(DEFAULT_STYLE, style),
    viewport: { x0: 0, x1: 100, y0: 0, y1: 100 },
  };
}

test("defaults reproduce the original look", () => {
  expect(DEFAULT_STYLE).toMatchObject({
    gap: 2,
    cornerRadius: 0,
    fontFamily: "sans-serif",
    textColor: "white",
    textStroke: "rgba(9, 14, 25, 0.84)",
    textAlign: "center",
    hoverOpacity: 0.6,
  });
  expect(Object.isFrozen(DEFAULT_STYLE)).toBe(true);
});

test("returns the base style unchanged when there are no overrides", () => {
  expect(resolveStyle(DEFAULT_STYLE)).toBe(DEFAULT_STYLE);
  expect(resolveStyle(DEFAULT_STYLE, null)).toBe(DEFAULT_STYLE);
});

test("merges overrides over the base and freezes the result", () => {
  const style = resolveStyle(DEFAULT_STYLE, { gap: 4, fontWeight: 600 });

  expect(style.gap).toBe(4);
  expect(style.fontWeight).toBe(600);
  expect(style.fontFamily).toBe("sans-serif");
  expect(Object.isFrozen(style)).toBe(true);
});

test.each([
  [{ gapp: 2 }, 'unknown option "gapp"'],
  [{ gap: -1 }, "gap must be a finite number of at least 0"],
  [{ cornerRadius: Number.NaN }, "cornerRadius"],
  [{ maxFontSize: 0 }, "maxFontSize must be a finite number greater than 0"],
  [{ minFontSize: 20, maxFontSize: 10 }, "minFontSize must not exceed"],
  [{ textAlign: "left" }, "textAlign must be one of center, start"],
  [{ hoverOpacity: 2 }, "hoverOpacity must be a number from 0 to 1"],
  [{ fontFamily: " " }, "fontFamily must be a non-empty string"],
  [{ textColor: 3 }, "textColor must be a non-empty string"],
  [{ fontWeight: 0 }, "fontWeight must be"],
  [[], "style must be an object"],
])("rejects an invalid style %o", (overrides, message) => {
  expect(() => resolveStyle(DEFAULT_STYLE, overrides)).toThrow(message);
});

test("allows turning the text outline off", () => {
  expect(resolveStyle(DEFAULT_STYLE, { textStroke: null }).textStroke).toBe(
    null,
  );
});

test("insets each block by half the gap, scaled by the pixel ratio", () => {
  const painter = createPainter({ gap: 4 }, 2);

  // A 50 CSS-px block is 100 device px; half of a 4 px gap is 2 CSS px = 4 device px.
  fillRect.call(painter, 0, 0, 50, 50, { color: "red" });

  expect(painter.canvas2dContext.fillRect).toHaveBeenCalledWith(4, 4, 92, 92);
});

test("rounds corners, capped at half the block", () => {
  const painter = createPainter({ cornerRadius: 40 });

  fillRect.call(painter, 0, 0, 100, 30, { color: "red" });

  expect(painter.canvas2dContext.roundRect).toHaveBeenCalledWith(
    1,
    1,
    98,
    28,
    14,
  );
  expect(painter.canvas2dContext.fill).toHaveBeenCalled();
  expect(painter.canvas2dContext.fillRect).not.toHaveBeenCalled();
});

test("falls back to square corners without roundRect support", () => {
  const painter = createPainter({ cornerRadius: 6 });
  delete painter.canvas2dContext.roundRect;

  fillRect.call(painter, 0, 0, 100, 100, { color: "red" });

  expect(painter.canvas2dContext.fillRect).toHaveBeenCalled();
});

test("uses the configured font and skips the outline when it's off", () => {
  const painter = createPainter({
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    textStroke: null,
  });

  fillText.call(painter, "Label", { x0: 0, y0: 0, x1: 100, y1: 100 }, 12);

  expect(painter.canvas2dContext.font).toBe("600 12px Inter, sans-serif");

  const plain = createPainter();
  fillText.call(plain, "Label", { x0: 0, y0: 0, x1: 100, y1: 100 }, 12);
  expect(plain.canvas2dContext.font).toBe("12px sans-serif");
  expect(painter.canvas2dContext.strokeText).not.toHaveBeenCalled();
  expect(painter.canvas2dContext.fillText).toHaveBeenCalled();
});

test("start alignment anchors the label to the padded top-left corner", () => {
  const painter = createPainter({ textAlign: "start", textPadding: 8 });

  fillText.call(painter, "Label", { x0: 0, y0: 0, x1: 100, y1: 100 }, 10);

  // Inset 1 (half the default gap) + padding 8 = 9; the first line is centered
  // on its line box of 12 (1.2 x the font size).
  expect(painter.canvas2dContext.textAlign).toBe("start");
  expect(painter.canvas2dContext.fillText).toHaveBeenCalledWith(
    "Label",
    9,
    15,
    82,
  );
});

test("start alignment anchors to the right edge in right-to-left canvases", () => {
  const painter = createPainter({ textAlign: "start" });
  painter.canvas2dContext.direction = "rtl";

  fillText.call(painter, "Label", { x0: 0, y0: 0, x1: 100, y1: 100 }, 10);

  expect(painter.canvas2dContext.fillText.mock.calls[0][1]).toBe(99);
});

test("hides labels below the minimum font size", () => {
  const painter = createPainter({ minFontSize: 14 });

  fillText.call(painter, "Label", { x0: 0, y0: 0, x1: 100, y1: 100 }, 12);

  expect(painter.canvas2dContext.fillText).not.toHaveBeenCalled();
});

test("re-wraps a cached label when the font changes", () => {
  const painter = createPainter();
  const item = {};
  const bounds = { x0: 0, y0: 0, x1: 60, y1: 100 };
  painter.canvas2dContext.measureText = jest.fn((text) => ({
    width: text.length * (painter.canvas2dContext.font.includes("700") ? 9 : 4),
  }));

  fillText.call(painter, "two words", bounds, 10, "white", item);
  const regularLines = painter.canvas2dContext.fillText.mock.calls.length;
  painter.canvas2dContext.fillText.mockClear();
  painter.style = resolveStyle(painter.style, { fontWeight: 700 });
  fillText.call(painter, "two words", bounds, 10, "white", item);

  expect(regularLines).toBe(1);
  expect(painter.canvas2dContext.fillText.mock.calls.length).toBe(2);
});

test("a text color callback chooses per block, with a safe fallback", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const painter = createPainter({
    textColor: ({ item }) => (item.dark ? "white" : "black"),
  });

  expect(resolveTextColor(painter, { item: { dark: true } })).toBe("white");
  expect(resolveTextColor(painter, { item: { dark: false } })).toBe("black");

  const broken = createPainter({ textColor: () => 42 });
  expect(resolveTextColor(broken, { item: {} })).toBe("white");
  expect(warn).toHaveBeenCalledTimes(1);
  warn.mockRestore();
});

describe("TreeBox style option", () => {
  let domElement;
  let getContext;
  let canvasSize;
  let context;

  beforeEach(() => {
    context = {
      ...createCanvasContext(),
      clearRect: jest.fn(),
      createLinearGradient: () => ({ addColorStop: jest.fn() }),
    };
    getContext = jest
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => context);
    // jsdom lays nothing out, so the canvas reports its backing-store size.
    canvasSize = [
      jest
        .spyOn(HTMLCanvasElement.prototype, "clientWidth", "get")
        .mockImplementation(function () {
          return this.width;
        }),
      jest
        .spyOn(HTMLCanvasElement.prototype, "clientHeight", "get")
        .mockImplementation(function () {
          return this.height;
        }),
    ];
    domElement = document.createElement("div");
    Object.defineProperty(domElement, "clientWidth", { value: 200 });
    Object.defineProperty(domElement, "clientHeight", { value: 100 });
    document.body.appendChild(domElement);
  });

  afterEach(() => {
    domElement.remove();
    getContext.mockRestore();
    canvasSize.forEach((spy) => spy.mockRestore());
  });

  test("validates the style before creating anything", () => {
    expect(
      () => new TreeBox({ data: [], domElement, style: { gap: -1 } }),
    ).toThrow("gap must be");
    expect(domElement.querySelector("canvas")).toBeNull();
  });

  test("setStyle merges changes and null resets to the defaults", () => {
    const treebox = new TreeBox({
      data: [{ text: "a", weight: 1 }],
      domElement,
      style: { gap: 6, cornerRadius: 4 },
    });

    treebox.setStyle({ cornerRadius: 8 });
    expect(treebox.style).toMatchObject({ gap: 6, cornerRadius: 8 });

    treebox.setStyle(null);
    expect(treebox.style).toBe(DEFAULT_STYLE);

    expect(() => treebox.setStyle({ textAlign: "middle" })).toThrow(
      "textAlign",
    );
    expect(treebox.style).toBe(DEFAULT_STYLE);
    treebox.destroy();
  });

  test("setStyle repaints with the new look", () => {
    const treebox = new TreeBox({
      data: [{ text: "a", weight: 1, color: "red" }],
      domElement,
    });
    context.fillText.mockClear();

    treebox.setStyle({ fontFamily: "Inter", fontWeight: 600 });

    expect(context.fillText).toHaveBeenCalled();
    expect(context.font).toMatch(/^600 \d+px Inter$/);
    treebox.destroy();
  });

  test("setStyle after destroy does nothing", () => {
    const treebox = new TreeBox({ data: [], domElement });
    treebox.destroy();

    expect(() => treebox.setStyle({ gap: 8 })).not.toThrow();
  });
});
