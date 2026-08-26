import { layoutLayer } from "./layout";

test("lays out empty data without failing", () => {
  expect(() =>
    layoutLayer([], { x0: 0, x1: 100, y0: 0, y1: 50, depth: 0 }),
  ).not.toThrow();
});

test("supplies safe leaf weights without changing input order", () => {
  const first = { text: "first", children: null };
  const second = { text: "second", weight: 4, children: null };
  const data = [first, second];

  layoutLayer(data, { x0: 0, x1: 100, y0: 0, y1: 50, depth: 0 });

  expect(data).toEqual([first, second]);
  expect(first.weight).toBe(1);
  for (const item of data) {
    expect(item.x0).toEqual(expect.any(Number));
    expect(item.x1).toEqual(expect.any(Number));
    expect(item.y0).toEqual(expect.any(Number));
    expect(item.y1).toEqual(expect.any(Number));
  }
});

test("keeps coordinates finite when valid weights overflow their sum", () => {
  const data = [
    { text: "huge-a", weight: Number.MAX_VALUE, children: null },
    { text: "huge-b", weight: Number.MAX_VALUE, children: null },
  ];

  layoutLayer(data, { x0: 0, x1: 240, y0: 0, y1: 120, depth: 0 });

  expect(data.map(({ x0, x1, y0, y1 }) => [x0, x1, y0, y1])).toEqual([
    [0, 120, 0, 120],
    [120, 240, 0, 120],
  ]);
});

test("saturates generated parent weights instead of storing Infinity", () => {
  const data = [
    {
      text: "group",
      children: [
        { text: "huge-a", weight: Number.MAX_VALUE, children: null },
        { text: "huge-b", weight: Number.MAX_VALUE, children: null },
      ],
    },
    { text: "peer", weight: Number.MAX_VALUE, children: null },
  ];

  layoutLayer(data, { x0: 0, x1: 240, y0: 0, y1: 120, depth: 0 });

  expect(data[0].weight).toBe(Number.MAX_VALUE);
  for (const item of [data[0], data[1], ...data[0].children]) {
    expect([item.x0, item.x1, item.y0, item.y1].every(Number.isFinite)).toBe(
      true,
    );
  }
});

test("preserves the stable weighted layout while partitioning sorted ranges", () => {
  const data = [8, 7, 6, 5, 4, 3, 2, 1].map((weight, index) => ({
    text: String(index),
    weight,
    children: null,
  }));

  layoutLayer(data, { x0: 0, x1: 100, y0: 0, y1: 60, depth: 0 });

  expect(data.map(({ x0, x1, y0, y1 }) => [x0, x1, y0, y1])).toEqual([
    [0, 31, 0, 43],
    [31, 58, 0, 43],
    [0, 58, 43, 60],
    [58, 81, 0, 36],
    [81, 100, 0, 36],
    [58, 79, 36, 60],
    [79, 100, 36, 52],
    [79, 100, 52, 60],
  ]);
});

test("rebases tiny weight ranges without producing unusable coordinates", () => {
  const data = [
    { text: "dominant", weight: Number.MAX_VALUE, children: null },
    { text: "tiny-a", weight: 2, children: null },
    { text: "tiny-b", weight: 1, children: null },
  ];

  layoutLayer(data, { x0: 0, x1: 300, y0: 0, y1: 120, depth: 0 });

  expect(data.every((item) => item.layoutOk)).toBe(true);
  expect(
    data.every((item) =>
      [item.x0, item.x1, item.y0, item.y1].every(Number.isFinite),
    ),
  ).toBe(true);
});
