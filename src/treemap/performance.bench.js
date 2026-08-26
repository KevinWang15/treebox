import { bench, describe } from "vitest";
import { fillText } from "./canvas";
import { findItemAtPosition } from "./interaction";
import { layoutLayer } from "./layout";
import { paintLayer } from "./paint";

function createWeightedItems(size) {
  return Array.from({ length: size }, (_, index) => ({
    text: String(index),
    weight: (index % 97) + 1,
    children: null,
  }));
}

describe("layout", () => {
  const thousandItems = createWeightedItems(1_000);
  const tenThousandItems = createWeightedItems(10_000);
  const bounds = { x0: 0, x1: 1920, y0: 0, y1: 1080, depth: 0 };

  bench("1,000 siblings", () => {
    layoutLayer(thousandItems, bounds);
  });

  bench("10,000 siblings", () => {
    layoutLayer(tenThousandItems, bounds);
  });
});

describe("interaction", () => {
  const columns = 100;
  const items = Array.from({ length: 10_000 }, (_, index) => ({
    x0: (index % columns) * 10,
    x1: ((index % columns) + 1) * 10,
    y0: Math.floor(index / columns) * 10,
    y1: (Math.floor(index / columns) + 1) * 10,
  }));
  const context = {
    activeNode: { children: items },
    hitTestIndex: null,
    viewportUtils: { reverseTransform: (point) => point },
  };
  findItemAtPosition.call(context, { x: 0.5, y: 0.5 });
  let query = 0;

  bench("indexed hit test among 10,000 siblings", () => {
    query = (query + 7919) % items.length;
    findItemAtPosition.call(context, {
      x: (query % columns) * 10 + 0.5,
      y: Math.floor(query / columns) * 10 + 0.5,
    });
  });
});

describe("painting", () => {
  const data = Array.from({ length: 10_000 }, (_, index) => ({
    text: "",
    color: "#123456",
    children: null,
    x0: index * 10,
    x1: (index + 1) * 10,
    y0: 0,
    y1: 100,
  }));
  const paintContext = {
    activeNode: {},
    canvas2dContext: { fillStyle: "#000000" },
    canvasElement: { width: 1_000, height: 100 },
    canvasUtils: {
      clearRect() {},
      fillRect() {},
      fillText() {},
    },
    pixelRatio: 1,
    transitionTargetNode: null,
    viewportUtils: { transform: (bounds) => bounds },
  };
  paintContext.paintLayer = paintLayer.bind(paintContext);

  bench("10,000 nodes with 100 visible", () => {
    paintContext.paintLayer(data, { hovering: false, depth: 0 });
  });

  const canvas2dContext = {
    beginPath() {},
    clip() {},
    fillText() {},
    measureText(text) {
      return { width: text.length * 10 };
    },
    rect() {},
    restore() {},
    save() {},
    strokeText() {},
  };
  const textContext = {
    BOX_MARGIN: 1,
    canvas2dContext,
    pixelRatio: 1,
  };
  const labelItem = {};
  fillText.call(
    textContext,
    "A cached multiline treemap label",
    { x0: 0, x1: 240, y0: 0, y1: 120 },
    20,
    "white",
    labelItem,
  );

  bench("cached label layout", () => {
    fillText.call(
      textContext,
      "A cached multiline treemap label",
      { x0: 0, x1: 240, y0: 0, y1: 120 },
      20,
      "white",
      labelItem,
    );
  });
});
